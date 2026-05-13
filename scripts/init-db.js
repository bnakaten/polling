const sqlite3 = require("sqlite3").verbose();
const dbPath = "./polling.db";

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  console.log("Creating database schema...");
  
  db.run(`
    CREATE TABLE IF NOT EXISTS "User" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "email" TEXT NOT NULL,
      "password" TEXT NOT NULL,
      "isAdmin" BOOLEAN NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS "Poll" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "userId" INTEGER NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS "Question" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "text" TEXT NOT NULL,
      "pollId" INTEGER NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS "Option" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "text" TEXT NOT NULL,
      "questionId" INTEGER NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS "Token" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "token" TEXT NOT NULL UNIQUE,
      "pollId" INTEGER NOT NULL,
      "used" BOOLEAN NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS "Response" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "token" TEXT NOT NULL,
      "questionId" INTEGER NOT NULL,
      "optionId" INTEGER NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("token", "questionId")
    )
  `);

  db.run(`CREATE UNIQUE INDEX "User_email_key" ON "User"("email")`);
  db.run(`CREATE UNIQUE INDEX "Token_token_key" ON "Token"("token")`);
  db.run(`CREATE UNIQUE INDEX "Response_token_questionId_key" ON "Response"("token", "questionId")`);

  db.close();
  console.log("Database schema created successfully!");
});
