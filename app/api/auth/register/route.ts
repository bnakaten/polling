import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hash } from "bcrypt";
import { cookies } from "next/headers";

const SALT_ROUNDS = 10;

export async function POST(request: Request) {
  const host = request.headers.get("host");
  if (host !== "localhost" && !host?.includes("localhost")) {
    return NextResponse.json({ error: "Registration only available on localhost" }, { status: 403 });
  }

  try {
    const { email, password, isAdmin = false } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 });
    }

    const hashedPassword = await hash(password, SALT_ROUNDS);

    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        isAdmin,
      },
    });

    return NextResponse.json({ success: true, user: { id: user.id, email: user.email, isAdmin: user.isAdmin } });
  } catch (error) {
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
