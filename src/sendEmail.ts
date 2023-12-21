// Import statements
import nodemailer from "nodemailer";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import "dotenv/config";

// Constants for email configuration
const senderEmail = process.env.SENDER_EMAIL;
const emailPassword = process.env.EMAIL_PASSWORD;
const SMTP_HOST_ADDRESS = process.env.SMTP_HOST_ADDRESS;
const databasePath = "./src/database/emailCache.db";

// Function to open a connection to the SQLite database
async function openDB() {
  const db = await open({
    filename: databasePath,
    driver: sqlite3.Database,
  });

  // Create necessary tables if they don't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS emailCache (
      id INTEGER PRIMARY KEY,
      subject TEXT,
      content TEXT
    );
    CREATE TABLE IF NOT EXISTS recipients (
      email TEXT PRIMARY KEY
    );
    CREATE TABLE IF NOT EXISTS blockCache (
      blockHeight INTEGER,
      content TEXT
    );
  `);

  return db;
}

// Function to perform a database operation with retry logic
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 100
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      if (error.code === "SQLITE_BUSY" && attempt < maxRetries) {
        console.log(
          `SQLite busy, retrying operation (Attempt ${attempt} of ${maxRetries})`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  throw new Error("Max retries reached for database operation");
}

// Function to retrieve all recipient emails from the database
async function getRecipients() {
  return withRetry(async () => {
    const db = await openDB();
    const recipients = await db.all("SELECT email FROM recipients");
    await db.close();
    return recipients.map((row) => row.email);
  });
}

// Function to get the last inserted ID from the database
async function getLastInsertedID() {
  return withRetry(async () => {
    const db = await openDB();
    const result = await db.get("SELECT last_insert_rowid() as id");
    await db.close();
    return result.id;
  });
}

// Function to insert email details into the database for caching
async function cacheEmail(subject: string, text: string) {
  return withRetry(async () => {
    const db = await openDB();
    await db.run("INSERT INTO emailCache (subject, content) VALUES (?, ?)", [
      subject,
      text,
    ]);
    await db.close();
  });
}

// Function to send an email with retry logic
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
        host: SMTP_HOST_ADDRESS,
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
    await withRetry(async () => {
      const db = await openDB();
      await db.run("DELETE FROM emailCache WHERE id = ?", [id]);
      await db.close();
    });
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

// Function to cache a request in the database
export async function cacheRequest(blockHeight: number, content: string) {
  return withRetry(async () => {
    const db = await openDB();
    await db.run(
      "INSERT INTO blockCache (blockHeight, content) VALUES (?, ?)",
      [blockHeight, content]
    );
    await db.close();
  });
}

// Helper function to format the data for the email
function formatRequestData(requestData: any): string {
  const data = requestData.data;
  let tagsFormatted = 'No Tags';
  if (data.tags && Array.isArray(data.tags)) {
    tagsFormatted = data.tags.map((tag: any) => {
      const name = Buffer.from(tag.name, 'base64').toString('utf-8');
      const value = Buffer.from(tag.value, 'base64').toString('utf-8');
      return `${name}: ${value}`;
    }).join(', ');
  }

  const idLink = `https://arweave.net/${data.id}`;
  const parentIdLink = data.parent_id ? `https://arweave.net/${data.parent_id}` : 'N/A';

  return `
    Event: ${requestData.event}
    ID: [${data.id}](${idLink})
    Parent ID: [${data.parent_id || 'N/A'}](${parentIdLink})
    Owner Address: ${data.owner_address || 'N/A'}
    Tags: ${tagsFormatted}
    Data Size: ${data.data_size ? (data.data_size / 1024).toFixed(2) + ' KB' : 'N/A'}
  `;
}

// Function to process cached requests and send emails
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
      const data = JSON.parse(content);
      acc[blockHeight].push(formatRequestData(data));
      return acc;
    },
    {} as EmailsByBlock
  );

  for (const [blockHeight, contents] of Object.entries(emailsByBlock)) {
    const emailContent = contents.join("\n\n");
    await sendEmail(
      `New POST Requests for Block Height ${blockHeight}`,
      emailContent
    );
  }
}

// Main function to send an email
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
