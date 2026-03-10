const Database = require("better-sqlite3");
const path = require("path");

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
    console.log("Connected to local SQLite database");
    return db;
}

function getDB() {
    return db;
}

module.exports = { connectDB, getDB };