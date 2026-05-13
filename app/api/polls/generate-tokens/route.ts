import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateVotingToken } from "@/lib/poll";
import { verify } from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

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

    const { pollId, count, maxVotes } = await request.json();

    if (!pollId || !count || count < 1 || count > 100) {
      return NextResponse.json({ error: "Invalid poll ID or count" }, { status: 400 });
    }

    const votesPerToken = typeof maxVotes === 'number' && maxVotes >= 1 ? maxVotes : 1;

    const poll = await db.poll.findUnique({
      where: { id: pollId },
    });

    if (!poll) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    if (poll.userId !== userId) {
      return NextResponse.json({ error: "Not authorized to generate tokens for this poll" }, { status: 403 });
    }

    const tokens = [];
    for (let i = 0; i < count; i++) {
      const token = await generateVotingToken(pollId, votesPerToken);
      tokens.push(token);
    }

    return NextResponse.json({ 
      success: true, 
      urls: tokens.map(token => `${process.env.NEXT_PUBLIC_APP_URL || "https://rfcs.fun:3443"}/vote/${token}`),
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to generate tokens" }, { status: 500 });
  }
}
