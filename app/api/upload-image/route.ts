import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verify } from "jsonwebtoken";
import { cookies } from "next/headers";
import { writeFile } from "fs/promises";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import { readFileSync } from "fs";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

const UPLOAD_DIR = join(process.cwd(), "public", "poll-images");

if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

export async function POST(request: Request) {
  try {
    const authCookie = (await cookies()).get("auth_token");
    if (!authCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let userId;
    try {
      const decoded = verify(authCookie.value, JWT_SECRET);
      userId = (decoded as { userId: number }).userId;
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existingUser = await db.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid image type. Only JPEG, PNG, GIF, and WebP are allowed" }, { status: 400 });
    }

    const maxSize = 5 * 1024 * 1024;
    const bytes = await file.arrayBuffer();
    if (bytes.byteLength > maxSize) {
      return NextResponse.json({ error: "Image size exceeds 5MB limit" }, { status: 400 });
    }

    const buffer = Buffer.from(bytes);
    const fileExt = file.type.split("/")[1];
    const fileName = `poll_${Date.now()}_${userId}.${fileExt}`;
    const filePath = join(UPLOAD_DIR, fileName);

    await writeFile(filePath, buffer);

    const imageUrl = `/poll-images/${fileName}`;

    return NextResponse.json({ 
      success: true, 
      imageUrl,
      message: "Image uploaded successfully"
    });
  } catch (error: any) {
    console.error("Error uploading image:", error);
    return NextResponse.json({ error: "Failed to upload image", details: error.message }, { status: 500 });
  }
}
