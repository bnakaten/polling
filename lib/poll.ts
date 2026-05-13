import { db } from "@/lib/db";
import { randomBytes } from "crypto";

export async function createPoll(
  title: string,
  description: string,
  questions: Array<{ text: string; options: string[] }>,
  creatorId: number,
  url: string
) {
  try {
    const poll = await db.poll.create({
      data: {
        title,
        description,
        url,
        questions: {
          create: questions.map((q) => ({
            text: q.text,
            options: {
              create: q.options.map((opt) => ({ text: opt })),
            },
          })),
        },
         user: {
           connect: { id: creatorId },
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

    return { success: true, poll };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function generateVotingToken(pollId: number, maxVotes: number = 1, tx?: any): Promise<string> {
  try {
    const token = randomBytes(32).toString("hex");
    const client = tx || db;

    await client.token.create({
      data: {
        token,
        pollId,
        used: false,
        maxVotes,
        voteCount: 0,
      },
    });

    return token;
  } catch (error: any) {
    throw new Error(`Failed to generate token: ${error.message}`);
  }
}

export async function getPollById(pollId: number) {
  return db.poll.findUnique({
    where: { id: pollId },
    include: {
      questions: {
        include: {
          options: true,
        },
      },
    },
  });
}

export async function getPollByToken(token: string) {
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

  if (!tokenRecord || tokenRecord.voteCount >= tokenRecord.maxVotes) {
    return null;
  }

  return tokenRecord.poll;
}

export async function submitResponse(token: string, responses: Array<{ questionId: number; optionId: number }>) {
  try {
    const tokenRecord = await db.token.findUnique({
      where: { token },
      include: { poll: true },
    });

    if (!tokenRecord || tokenRecord.voteCount >= tokenRecord.maxVotes) {
      throw new Error("Invalid or max votes reached");
    }

    if (responses.length === 0) {
      throw new Error("No responses provided");
    }

    await db.$transaction(
      responses.map((response) =>
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

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPollResults(pollId: number) {
  const poll = await db.poll.findUnique({
    where: { id: pollId },
    include: {
      questions: {
        include: {
          options: {
            include: {
              responses: true,
            },
          },
        },
      },
    },
  });

  if (!poll) {
    return null;
  }

  const results = poll.questions.map((question: { id: number; text: string; options: { id: number; text: string; responses: unknown[] }[] }) => ({
    questionId: question.id,
    text: question.text,
    options: question.options.map((option: { id: number; text: string; responses: unknown[] }) => ({
      optionId: option.id,
      text: option.text,
      count: option.responses.length,
    })),
  }));

  return { poll, results };
}

export async function getAllPolls() {
  return db.poll.findMany({
    include: {
      questions: true,
      tokens: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function deletePoll(pollId: number) {
  try {
    await db.poll.delete({
      where: { id: pollId },
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
