import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const tokenRecord = await db.token.findUnique({
      where: { token },
      include: { poll: true },
    });

    if (!tokenRecord) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    if (tokenRecord.used) {
      return NextResponse.json({ error: "Token has already been used" }, { status: 400 });
    }

    if (tokenRecord.voteCount >= tokenRecord.maxVotes) {
      return NextResponse.json({ error: "Maximum votes for this URL reached" }, { status: 400 });
    }

    return NextResponse.json({ success: true, poll: tokenRecord.poll });
  } catch (error) {
    return NextResponse.json({ error: "Failed to validate token" }, { status: 500 });
  }
}
