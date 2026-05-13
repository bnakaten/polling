import Database from "better-sqlite3";
import bcrypt from "bcrypt";

const db = new Database("polling.db");

// User table
db.exec(`
  CREATE TABLE IF NOT EXISTS "User" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    isAdmin INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

// Poll table
db.exec(`
  CREATE TABLE IF NOT EXISTS "Poll" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    userId INTEGER NOT NULL,
    FOREIGN KEY (userId) REFERENCES "User"(id)
  )
`);

// Question table
db.exec(`
  CREATE TABLE IF NOT EXISTS "Question" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    pollId INTEGER NOT NULL,
    FOREIGN KEY (pollId) REFERENCES "Poll"(id) ON DELETE CASCADE
  )
`);

// Option table
db.exec(`
  CREATE TABLE IF NOT EXISTS "Option" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    questionId INTEGER NOT NULL,
    FOREIGN KEY (questionId) REFERENCES "Question"(id) ON DELETE CASCADE
  )
`);

// Token table
db.exec(`
  CREATE TABLE IF NOT EXISTS "Token" (
    id TEXT PRIMARY KEY,
    token TEXT UNIQUE NOT NULL,
    pollId INTEGER NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pollId) REFERENCES "Poll"(id) ON DELETE CASCADE
  )
`);

// Response table
db.exec(`
  CREATE TABLE IF NOT EXISTS "Response" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL,
    questionId INTEGER NOT NULL,
    optionId INTEGER NOT NULL,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (token) REFERENCES "Token"(id) ON DELETE CASCADE,
    FOREIGN KEY (questionId) REFERENCES "Question"(id) ON DELETE CASCADE,
    FOREIGN KEY (optionId) REFERENCES "Option"(id) ON DELETE CASCADE,
    UNIQUE(token, questionId)
  )
`);

// Create default admin user
const hashedPassword = bcrypt.hashSync("admin123", 10);
const stmt = db.prepare(`
  INSERT OR IGNORE INTO "User" (email, password, isAdmin) VALUES (?, ?, ?)
`);
stmt.run("admin@polling.local", hashedPassword, 1);

console.log("Database created successfully!");
db.close();
