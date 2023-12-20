import nodemailer from "nodemailer";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import "dotenv/config";

const senderEmail = process.env.SENDER_EMAIL;
const emailPassword = process.env.EMAIL_PASSWORD;
const SMTP_HOST_ADDRESS = process.env.SMTP_HOST_ADDRESS;

const databasePath = "./src/database/emailCache.db";

async function openDB() {
  const db = await open({
    filename: databasePath,
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS emailCache (
      id INTEGER PRIMARY KEY,
      subject TEXT,
      content TEXT
    );
    CREATE TABLE IF NOT EXISTS recipients (
      id INTEGER PRIMARY KEY,
      email TEXT
    );
    CREATE TABLE IF NOT EXISTS blockCache (
      id INTEGER PRIMARY KEY,
      blockHeight INTEGER,
      content TEXT
    );
  `);

  return db;
}

async function getRecipients() {
  const db = await openDB();
  const recipients = await db.all("SELECT email FROM recipients");
  await db.close();
  return recipients.map((row) => row.email);
}

async function getLastInsertedID() {
  const db = await openDB();
  const result = await db.get("SELECT last_insert_rowid() as id");
  await db.close();
  return result.id;
}

async function cacheEmail(subject: string, text: string) {
  const db = await openDB();
  await db.run("INSERT INTO emailCache (subject, content) VALUES (?, ?)", [
    subject,
    text,
  ]);
  await db.close();
}

async function sendMailWithRetry(
  id: number,
  to: string,
  subject: string,
  text: string,
  retries: number
) {
  const transporter = senderEmail?.endsWith("@gmail.com")
    ? nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: senderEmail,
          pass: emailPassword,
        },
      })
    : nodemailer.createTransport({
        host: SMTP_HOST_ADDRESS, // Custom SMTP host address
        port: 465,
        secure: true,
        auth: {
          user: senderEmail,
          pass: emailPassword,
        },
      });

  const mailOptions = {
    from: senderEmail,
    to,
    subject,
    text,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);
    const db = await openDB();
    await db.run("DELETE FROM emailCache WHERE id = ?", [id]);
    await db.close();
  } catch (error) {
    console.error("Error sending email:", error);
    if (retries < 3) {
      console.log(`Retrying... Attempt: ${retries + 1}`);
      await sendMailWithRetry(id, to, subject, text, retries + 1);
    } else {
      console.error("Max retries reached. Email not sent.");
    }
  }
}

export async function cacheRequest(blockHeight: number, content: string) {
  const db = await openDB();
  await db.run("INSERT INTO blockCache (blockHeight, content) VALUES (?, ?)", [
    blockHeight,
    content,
  ]);
  await db.close();
}

export async function processCachedRequests() {
  const db = await openDB();
  const cachedRequests = await db.all(
    "SELECT blockHeight, content FROM blockCache"
  );
  await db.run("DELETE FROM blockCache");
  await db.close();

  // Define a type for the emailsByBlock object
  interface EmailsByBlock {
    [key: number]: string[];
  }

  const emailsByBlock: EmailsByBlock = cachedRequests.reduce(
    (acc, { blockHeight, content }) => {
      if (!acc[blockHeight]) {
        acc[blockHeight] = [];
      }
      acc[blockHeight].push(content);
      return acc;
    },
    {} as EmailsByBlock
  );

  for (const [blockHeight, contents] of Object.entries(emailsByBlock)) {
    const emailContent = contents.join("\n");
    await sendEmail(
      `New POST Requests for Block Height ${blockHeight}`,
      emailContent
    );
  }
}

export async function sendEmail(subject: string, text: string) {
  await cacheEmail(subject, text);
  const lastID = await getLastInsertedID();

  if (lastID !== undefined) {
    const recipients = await getRecipients();
    for (const recipient of recipients) {
      await sendMailWithRetry(lastID, recipient, subject, text, 0);
    }
  } else {
    console.error(
      "Error: Unable to retrieve the last inserted ID from the database."
    );
  }
}
