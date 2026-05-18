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

  const existingUser = await db.user.findUnique({ where: { id: userId } });
  if (!existingUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

    const { title, description, imageUrl, questions, url: pollUrl, urlCount = 1, maxVotes = 1 } = await request.json();

    if (!title || !questions || questions.length === 0) {
      return NextResponse.json({ error: "Title and questions are required" }, { status: 400 });
    }

    if (!pollUrl) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    if (!Array.isArray(questions) || questions.some((q: any) => {
      const needsOptions = q.answerType === "default" || !q.answerType;
      const isMultirangeslider = q.answerType === "multirangeslider";
      return !q.text || (needsOptions && !isMultirangeslider && (!q.options || q.options.length === 0));
    })) {
      return NextResponse.json({ error: "Each question must have text and options" }, { status: 400 });
    }

    const createdPoll = await db.$transaction(async (tx: any) => {
      const poll = await tx.poll.create({
        data: {
          userId,
          title,
          description: description || "",
          imageUrl: imageUrl || null,
          url: pollUrl,
      questions: {
        create: questions.map((q: any) => ({
          text: q.text,
          category: q.category || null,
          description: q.description || null,
          answerType: q.answerType || "default",
          imageUrl: q.imageUrl || null,
          isOptional: q.isOptional || false,
          options: q.answerType === "multirangeslider" ? undefined : {
            create: q.options.map((opt: string) => ({ text: opt })),
          },
          likelihood: q.likelihood ? parseInt(q.likelihood) : null,
          consequences: q.consequences ? parseInt(q.consequences) : null,
        })),
      },
        },
        include: {
          questions: {
            include: {
              options: true,
            },
          },
        },
      });

      for (let i = 0; i < urlCount; i++) {
        await generateVotingToken(poll.id, maxVotes, tx);
      }

      return poll;
    });

    const firstToken = await generateVotingToken(createdPoll.id);
    const votingLink = `${process.env.NEXT_PUBLIC_APP_URL || "https://rfcs.fun:3443"}/vote/${firstToken}`;
    const generatedUrls = [];
    for (let i = 0; i < urlCount; i++) {
      const token = await generateVotingToken(createdPoll.id);
      generatedUrls.push(`${process.env.NEXT_PUBLIC_APP_URL || "https://rfcs.fun:3443"}/vote/${token}`);
    }

    return NextResponse.json({ 
      success: true, 
       poll: {
         id: createdPoll.id,
         title: createdPoll.title,
         description: createdPoll.description,
         imageUrl: createdPoll.imageUrl,
         url: createdPoll.url,
       questions: createdPoll.questions.map((q: any) => ({
         id: q.id,
         text: q.text,
         answerType: q.answerType,
         imageUrl: q.imageUrl,
         isOptional: q.isOptional,
         options: q.options.map((opt: any) => ({ id: opt.id, text: opt.text })),
         likelihood: q.likelihood,
         consequences: q.consequences,
       })),
      },
      votingLink: generatedUrls[0],
      generatedUrls,
    });
  } catch (error: any) {
    console.error("Error creating poll:", error);
    return NextResponse.json({ error: "Failed to create poll", details: error.message }, { status: 500 });
  }
}
