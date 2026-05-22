import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verify } from "jsonwebtoken";
import Link from "next/link";
import GenerateTokenForm from "./GenerateTokenForm";
import DownloadCSV from "./DownloadCSV";
import PollResultsPageClient from "./PollResultsPageClient";

export const dynamic = "force-dynamic";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

async function getPollResults(pollId: number) {
  return await db.poll.findUnique({
    where: { id: pollId },
    include: {
      questions: {
        include: {
          options: {
            include: {
              responses: true,
            },
          },
          responses: true,
        },
      },
    },
  });
}

async function getPollDetails(pollId: number) {
  return await db.poll.findUnique({
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
}

export default async function PollResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pollId = parseInt(id);
  
  const authCookie = (await cookies()).get("auth_token");
  
  if (!authCookie) {
    throw new Error("Unauthorized");
  }

  let userId;
  try {
    const decoded = verify(authCookie.value, JWT_SECRET);
    userId = (decoded as { userId: number }).userId;
  } catch {
    throw new Error("Unauthorized");
  }

  const poll = await getPollResults(pollId);
  
  if (!poll) {
    throw new Error("Poll not found");
  }

  if (poll.userId !== userId) {
    throw new Error("Not authorized");
  }

  const results = poll.questions.map((question: any) => {
    const needsOptions = question.answerType === "default" || !question.answerType;
    
    if (needsOptions) {
      const skippedResponses = question.responses.filter((r: any) => r.text === "skipped");
      return {
        questionId: question.id,
        text: question.text,
        category: question.category,
        description: question.description,
        answerType: question.answerType,
        isOptional: question.isOptional,
        imageUrl: question.imageUrl,
        options: question.options.map((option: any) => ({
          optionId: option.id,
          text: option.text,
          count: option.responses.length,
        })),
        skippedCount: skippedResponses.length,
      };
    }
    
    const totalResponses = question.responses.length;
    const skippedResponses = question.responses.filter((r: any) => r.text === "skipped");
    
    if (question.answerType === "rating") {
      const nonSkippedResponses = question.responses.filter((r: any) => r.text !== "skipped");
      const responseValues = nonSkippedResponses.map((r: any) => parseInt(r.text || "0"));

      const ratingCounts: Record<string, number> = {};
      responseValues.forEach((val: number) => {
        const key = val.toString();
        ratingCounts[key] = (ratingCounts[key] || 0) + 1;
      });

      const ratingOptions = Object.keys(ratingCounts)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map(val => ({
          optionId: parseInt(val),
          text: val,
          count: ratingCounts[val],
        }));

      return {
        questionId: question.id,
        text: question.text,
        category: question.category,
        description: question.description,
        answerType: question.answerType,
        isOptional: question.isOptional,
        imageUrl: question.imageUrl,
        options: ratingOptions,
        skippedCount: skippedResponses.length,
        individualResponses: nonSkippedResponses.map((r: any) => r.text),
      };
    }

    if (question.answerType === "multirangeslider") {
      const responsePairs = question.responses.filter((r: any) => r.text !== "skipped").map((r: any) => r.text).filter(Boolean);

      const pairCounts: Record<string, number> = {};
      responsePairs.forEach((pair: string) => {
        pairCounts[pair] = (pairCounts[pair] || 0) + 1;
      });

      const likelihoodLabels: Record<string, string> = {
        "0": "0 No vote",
        "1": "1 Not likely",
        "2": "2 Low likely",
        "3": "3 Likely",
        "4": "4 Highly likely",
        "5": "5 Near certainty"
      };
      const consequencesLabels: Record<string, string> = {
        "0": "0 No vote",
        "1": "1 Minimal",
        "2": "2 Minor",
        "3": "3 Medium",
        "4": "4 Major",
        "5": "5 Critical"
      };

      const multirangeOptions = Object.keys(pairCounts)
        .sort((a, b) => {
          const [lA, cA] = a.split(",").map(Number);
          const [lB, cB] = b.split(",").map(Number);
          return (lA * 10 + cA) - (lB * 10 + cB);
        })
        .map(pair => {
          const [l, c] = pair.split(",");
          return {
            optionId: 0,
            text: `Likelihood: ${likelihoodLabels[l] || l}, Consequences: ${consequencesLabels[c] || c}`,
            count: pairCounts[pair],
          };
        });

      if (skippedResponses.length > 0) {
        multirangeOptions.push({
          optionId: 0,
          text: "Skipped (did not answer)",
          count: skippedResponses.length,
        });
      }

      return {
        questionId: question.id,
        text: question.text,
        category: question.category,
        description: question.description,
        answerType: question.answerType,
        isOptional: question.isOptional,
        imageUrl: question.imageUrl,
        options: multirangeOptions.length > 0 ? multirangeOptions : [{ optionId: 0, text: "No responses yet", count: 0 }],
        skippedCount: skippedResponses.length,
        individualResponses: responsePairs,
      };
    }
    
    // Textarea
    return {
      questionId: question.id,
      text: question.text,
      category: question.category,
      description: question.description,
      answerType: question.answerType,
      isOptional: question.isOptional,
      imageUrl: question.imageUrl,
      options: [
        {
          optionId: 0,
          text: totalResponses > 0 ? `${totalResponses} response${totalResponses !== 1 ? "s" : ""}` : "No responses yet",
          count: totalResponses,
        },
      ],
      skippedCount: skippedResponses.length,
      individualResponses: question.responses.filter((r: any) => r.text !== "skipped").map((r: any) => r.text),
    };
  });

  const pollDetails = await getPollDetails(pollId);
  
  return <PollResultsPageClient pollId={pollId} initialData={{ success: true, poll: { id: poll.id, title: poll.title, description: poll.description, imageUrl: poll.imageUrl }, results }} initialPollDetails={{ poll: { id: poll.id, title: poll.title, description: poll.description, tokens: pollDetails?.tokens.map((t: any) => ({ token: t.token, used: t.used, voteCount: t.voteCount, maxVotes: t.maxVotes })) || [] } }} />;
}
