import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateVotingToken } from "@/lib/poll";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const pollId = parseInt(id);
    const { maxVotes } = await request.json();

    const poll = await db.poll.findUnique({
      where: { id: pollId },
    });

    if (!poll) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    const votesPerToken = typeof maxVotes === 'number' && maxVotes >= 1 ? maxVotes : 1;
    const newToken = await generateVotingToken(pollId, votesPerToken);

    return NextResponse.json({ 
      success: true,
      votingLink: `http://localhost:3000/vote/${newToken}`,
    });
  } catch (error: any) {
    console.error("Token generation error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate token" }, { status: 500 });
  }
}
