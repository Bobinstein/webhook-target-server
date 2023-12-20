import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const databasePath = './src/database/emailCache.db'; // Update the path

async function openDB() {
  const db = await open({
    filename: databasePath,
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS recipients (
      email TEXT PRIMARY KEY
    )
  `);

  return db;
}

export async function addRecipient(email: string): Promise<string> {
  try {
    const db = await openDB();
    await db.run('INSERT INTO recipients (email) VALUES (?)', email);
    await db.close();
    return `Recipient added: ${email}`;
  } catch (error) {
    return `Error adding recipient: ${error}`;
  }
}

export async function removeRecipient(email: string): Promise<string> {
  try {
    const db = await openDB();
    await db.run('DELETE FROM recipients WHERE email = ?', email);
    await db.close();
    return `Recipient removed: ${email}`;
  } catch (error) {
    return `Error removing recipient: ${error}`;
  }
}
