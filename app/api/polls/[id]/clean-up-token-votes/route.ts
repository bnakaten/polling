import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verify } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pollId = parseInt(id);

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

  const poll = await db.poll.findUnique({
    where: { id: pollId },
    select: { userId: true },
  });

  if (!poll) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  }

  if (poll.userId !== userId) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await request.json();
  const { token } = body;

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  try {
    const tokenRecord = await db.token.findUnique({
      where: { token },
    });

    if (!tokenRecord) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    await db.response.deleteMany({
      where: {
        token: tokenRecord.id,
      },
    });

    await db.token.update({
      where: { token },
      data: { voteCount: 0 },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Votes for this token have been removed" 
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to clean up votes" }, { status: 500 });
  }
}
