import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hash } from "bcrypt";
import { requireAuth } from "@/lib/auth";

const SALT_ROUNDS = 10;

export async function PUT(request: Request) {
  const host = request.headers.get("host");
  if (host !== "localhost" && !host?.includes("localhost")) {
    return NextResponse.json({ error: "Password update only available on localhost" }, { status: 403 });
  }

  try {
    const user = await requireAuth();
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Current and new password are required" }, { status: 400 });
    }

    const existingUser = await db.user.findUnique({ where: { id: user.id } });
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { compare } = await import("bcrypt");
    const isValid = await compare(currentPassword, existingUser.password);
    if (!isValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }

    const hashedPassword = await hash(newPassword, SALT_ROUNDS);

    await db.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Password update failed" }, { status: 500 });
  }
}
