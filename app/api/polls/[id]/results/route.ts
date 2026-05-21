import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verify } from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const pollId = parseInt(id);

    const authCookie = (await cookies()).get("auth_token");
    if (!authCookie) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    let userId;
    try {
      const decoded = verify(authCookie.value, JWT_SECRET);
      userId = (decoded as { userId: number }).userId;
    } catch {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

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
            responses: true,
          },
        },
      },
    });

    console.log("=== Results endpoint ===");
    console.log("Poll ID:", pollId);
    console.log("Poll found:", !!poll);
    if (poll) {
      console.log("Questions:", poll.questions.length);
      poll.questions.forEach((q: any) => {
        console.log(`Question ${q.id}: ${q.text} - Options: ${q.options.length}, Total responses: ${q.options.reduce((sum: number, opt: any) => sum + opt.responses.length, 0)}`);
      });
    }

    if (!poll) {
      return NextResponse.json({ success: false, error: "Poll not found" }, { status: 404 });
    }

    if (poll.userId !== userId) {
      return NextResponse.json({ success: false, error: "Not authorized" }, { status: 403 });
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
      
      // For non-default questions (rating, textarea), count total responses
       const totalResponses = question.responses.length;
      
      if (question.answerType === "rating") {
        const skippedResponses = question.responses.filter((r: any) => r.text === "skipped");
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
        const skippedResponses = question.responses.filter((r: any) => r.text === "skipped");
        const responsePairs = question.responses.filter((r: any) => r.text !== "skipped").map((r: any) => r.text).filter(Boolean);

        const pairCounts: Record<string, number> = {};
        responsePairs.forEach((pair: string) => {
          pairCounts[pair] = (pairCounts[pair] || 0) + 1;
        });

        const likelihoodLabels: Record<string, string> = {
          "1": "1 Not likely",
          "2": "2 Low likely",
          "3": "3 Likely",
          "4": "4 Highly likely",
          "5": "5 Near certainty"
        };
        const consequencesLabels: Record<string, string> = {
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
      
      // For textarea questions, return a single option showing total responses
      const skippedResponses = question.responses.filter((r: any) => r.text === "skipped");
      
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

    return NextResponse.json({ 
      success: true, 
      poll: { id: poll.id, title: poll.title, description: poll.description, imageUrl: poll.imageUrl },
      results 
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch poll results" }, { status: 500 });
  }
}
