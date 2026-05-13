const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");

const dbPath = "./polling.db";
const SALT_ROUNDS = 10;

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  console.log("Creating default admin user...");
  
  const email = "admin@polling.local";
  const password = "admin123";
  const hashedPassword = bcrypt.hashSync(password, SALT_ROUNDS);

  db.get(`SELECT * FROM "User" WHERE email = ?`, [email], (err, row) => {
    if (err) {
      console.error("Error checking for existing user:", err);
      db.close();
      return;
    }

    if (row) {
      console.log("Admin user already exists:", email);
    } else {
      db.run(
        `INSERT INTO "User" (email, password, isAdmin) VALUES (?, ?, ?)`,
        [email, hashedPassword, true],
        function(err) {
          if (err) {
            console.error("Error creating admin user:", err);
          } else {
            console.log("Admin user created successfully!");
            console.log("Email:", email);
            console.log("Password:", password);
          }
          db.close();
        }
      );
    }
  });
});
