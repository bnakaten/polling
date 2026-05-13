import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcrypt";

const adapter = new PrismaBetterSqlite3({
  url: "file:./dev.db",
});

const prisma = new PrismaClient({ adapter });

async function createAdmin() {
  const email = "admin@polling.local";
  const password = "admin123";
  const hashedPassword = await bcrypt.hash(password, 10);

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    console.log("Admin user already exists:", email);
  } else {
    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        isAdmin: true,
      },
    });
    console.log("Admin user created successfully!");
    console.log("Email:", email);
    console.log("Password:", password);
  }

  await prisma.$disconnect();
}

createAdmin().catch(console.error);
