import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { token, responses } = await request.json();

    if (!token || !responses || !Array.isArray(responses) || responses.length === 0) {
      return NextResponse.json({ error: "Token and responses are required" }, { status: 400 });
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

    await db.$transaction(
      responses.map((response: any) =>
        db.response.create({
          data: {
            token: token,
            questionId: response.questionId,
            optionId: response.optionId,
          },
        })
      )
    );

    await db.token.update({
      where: { token },
      data: { 
        voteCount: tokenRecord.voteCount + 1,
        used: tokenRecord.voteCount + 1 >= tokenRecord.maxVotes,
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Vote submitted successfully" 
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to submit vote" }, { status: 500 });
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    
    const tokenRecord = await db.token.findUnique({
      where: { token },
      include: {
        poll: {
          include: {
            questions: {
              include: {
                options: true,
              },
            },
          },
        },
      },
    });

    if (!tokenRecord) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    if (tokenRecord.voteCount >= tokenRecord.maxVotes) {
      return NextResponse.json({ error: "Maximum votes for this URL reached" }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      poll: tokenRecord.poll,
      token: tokenRecord.token 
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to validate token" }, { status: 500 });
  }
}
