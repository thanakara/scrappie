import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const db = new Database(path.join(__dirname, "../scrappie.db"));

function connectDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      image_url TEXT NOT NULL,
      cloudinary_id TEXT,
      saved_by TEXT NOT NULL,
      saved_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("__sqlitedb__: connect");
  return db;
}

function getDB() {
  return db;
}

export { connectDB, getDB };