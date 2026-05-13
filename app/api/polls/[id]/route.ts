import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verify } from "jsonwebtoken";
import { cookies } from "next/headers";
import { unlink, stat } from "fs/promises";
import { join } from "path";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
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
      include: {
        questions: {
          include: {
            options: true,
          },
        },
        tokens: true,
      },
    });

    if (!poll) {
      return NextResponse.json({ success: false, error: "Poll not found" }, { status: 404 });
    }

    if (poll.userId !== userId) {
      return NextResponse.json({ error: "Not authorized to view this poll" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      poll: {
        id: poll.id,
        title: poll.title,
        description: poll.description,
        imageUrl: poll.imageUrl,
        questions: poll.questions.map((q: any) => ({
          id: q.id,
          text: q.text,
          category: q.category,
          description: q.description,
          answerType: q.answerType,
          imageUrl: q.imageUrl,
          isOptional: q.isOptional,
          options: q.options.map((opt: any) => ({ id: opt.id, text: opt.text })),
        })),
        tokens: poll.tokens.map((t: any) => ({
          token: t.token,
          used: t.used,
          voteCount: t.voteCount,
          maxVotes: t.maxVotes,
          createdAt: t.createdAt,
        })),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch poll" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params;
    const pollId = parseInt(id);

    const poll = await db.poll.findUnique({
      where: { id: pollId },
    });

    if (!poll) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    if (poll.userId !== userId) {
      return NextResponse.json({ error: "Not authorized to update this poll" }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, imageUrl, questions } = body;

    console.log("[DEBUG] Request body:", body);
    console.log("[DEBUG] Questions:", questions);
    if (questions && questions.length > 0) {
      console.log("[DEBUG] First question text type:", typeof questions[0]?.text, "value:", questions[0]?.text);
    }

    if (!title || !questions || questions.length === 0) {
      return NextResponse.json({ error: "Title and questions are required" }, { status: 400 });
    }

    await db.$transaction(
      questions.map((q: any) =>
        db.question.upsert({
          where: { id: q.id },
          update: {
            text: q.text,
            category: q.category || null,
            description: q.description || null,
            answerType: q.answerType || "default",
            imageUrl: q.imageUrl || null,
            isOptional: q.isOptional || false,
          },
          create: {
            text: q.text,
            category: q.category || null,
            description: q.description || null,
            answerType: q.answerType || "default",
            imageUrl: q.imageUrl || null,
            isOptional: q.isOptional || false,
            pollId,
            options: q.answerType === "multirangeslider" ? undefined : {
              create: q.options?.map((opt: any) => ({ text: opt.text })) || [],
            },
          },
        })
      )
    );

    await db.poll.update({
      where: { id: pollId },
      data: {
        title,
        description: description || "",
        imageUrl: imageUrl || null,
      },
    });

    const updatedPoll = await db.poll.findUnique({
      where: { id: pollId },
      include: {
        questions: {
          include: {
            options: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      poll: {
        id: updatedPoll?.id,
        title: updatedPoll?.title,
        description: updatedPoll?.description,
        imageUrl: updatedPoll?.imageUrl,
            questions: updatedPoll?.questions.map((q: any) => ({
              id: q.id,
              text: q.text,
              answerType: q.answerType,
              imageUrl: q.imageUrl,
              isOptional: q.isOptional,
              options: q.options.map((opt: any) => ({ id: opt.id, text: opt.text })),
            })),
      },
    });
  } catch (error) {
    console.error("Error updating poll:", error);
    return NextResponse.json({ error: "Failed to update poll", details: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params;
    const pollId = parseInt(id);

    const poll = await db.poll.findUnique({
      where: { id: pollId },
    });

    if (!poll) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    if (poll.userId !== userId) {
      return NextResponse.json({ error: "Not authorized to delete this poll" }, { status: 403 });
    }

    if (poll.imageUrl) {
      try {
        const imagePath = join(process.cwd(), "public", poll.imageUrl);
        const fileStats = await stat(imagePath).catch(() => null);
        if (fileStats) {
          await unlink(imagePath);
        }
      } catch (error) {
        console.error("Failed to delete image file:", error);
      }
    }

    const tokens = await db.token.findMany({
      where: { pollId },
    });

    const tokenValues = tokens.map((t: any) => t.token);

    await db.$transaction([
      db.response.deleteMany({
        where: { token: { in: tokenValues } },
      }),
      db.token.deleteMany({
        where: { pollId },
      }),
      db.question.deleteMany({
        where: { pollId },
      }),
      db.poll.delete({
        where: { id: pollId },
      }),
    ]);

    return NextResponse.json({ 
      success: true, 
      message: "Poll deleted successfully" 
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete poll" }, { status: 500 });
  }
}
