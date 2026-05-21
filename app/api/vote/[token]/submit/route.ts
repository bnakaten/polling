import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  console.log("=== API POST /api/vote/submit ===");
  const { token } = await params;
  console.log("TOKEN:", token);
  const formData = await request.formData();
  const responses = Array.from(formData.entries()).filter(([key]) => key.startsWith("question_"));
  
  console.log("All form data:");
  formData.forEach((value, key) => {
    console.log(`  ${key}: ${value}`);
  });
  console.log("Filtered responses:", responses.length);
  responses.forEach(([key, value]) => {
    console.log(`  ${key}: ${String(value).substring(0, 50)}${String(value).length > 50 ? '...' : ''}`);
  });

console.log("Form data entries:", Array.from(formData.entries()));

    const tokenRecord = await db.token.findUnique({
     where: { token },
     include: { 
       poll: {
         include: {
           questions: true,
         },
       },
     },
   });

   if (!tokenRecord) {
     console.log("Token not found:", token);
     return NextResponse.json({ error: "Invalid token" }, { status: 404 });
   }

if (tokenRecord.voteCount >= tokenRecord.maxVotes) {
      console.log("Max votes reached");
      return NextResponse.json({ error: "This voting link has reached its maximum number of votes" }, { status: 400 });
    }

   const questionMap = new Map();
   tokenRecord.poll.questions.forEach((q: any) => {
     questionMap.set(q.id, q);
   });

       await db.$transaction(async (tx) => {
         for (const [key, value] of responses) {
           const questionId = parseInt(key.replace("question_", ""));
           const responseValue = value as string;
           const question = questionMap.get(questionId);
           const needsOptions = question?.answerType === "default" || !question?.answerType;
           const isOptional = question?.isOptional || false;

           console.log(`Processing question ${questionId}: needsOptions=${needsOptions}, value="${responseValue}", answerType=${question?.answerType}, isOptional=${isOptional}, questionFound=${!!question}`);

  if (!question) {
    console.log(`  Question ${questionId} not found, skipping`);
    continue;
  }

  if (question?.answerType === "textarea" && isOptional && (responseValue === null || responseValue === "" || responseValue === "skipped")) {
    console.log(`  Creating skipped response for optional empty textarea question ${questionId}`);
    await tx.response.create({
      data: {
        token: tokenRecord.id,
        questionId,
        text: "skipped",
      },
    });
    continue;
  }

   if (question?.answerType === "multirangeslider" && isOptional && (responseValue === "0,0" || responseValue === "skipped")) {
    console.log(`  Creating skipped response for optional multirangeslider question ${questionId}`);
    await tx.response.create({
      data: {
        token: tokenRecord.id,
        questionId,
        text: "skipped",
      },
    });
    continue;
  }

  if (question?.answerType === "rating" && isOptional && responseValue === "skipped") {
    console.log(`  Creating skipped response for optional rating question ${questionId}`);
    await tx.response.create({
      data: {
        token: tokenRecord.id,
        questionId,
        text: "skipped",
      },
    });
    continue;
  }

  if (needsOptions && isOptional && responseValue === "skipped") {
    console.log(`  Creating skipped response for optional multiple choice question ${questionId}`);
    await tx.response.create({
      data: {
        token: tokenRecord.id,
        questionId,
        text: "skipped",
      },
    });
    continue;
  }

          let optionId, text;
         if (needsOptions) {
           optionId = /^\d+$/.test(responseValue) ? parseInt(responseValue) : undefined;
           text = undefined;
         } else {
           optionId = null;
           text = responseValue;
         }

         console.log(`  Creating response: questionId=${questionId}, optionId=${optionId}, text="${text}"`);

         await tx.response.create({
           data: {
             token: tokenRecord.id,
             questionId,
             optionId,
             text,
           },
         });
       }
     });

  const newVoteCount = tokenRecord.voteCount + 1;
  await db.token.update({
    where: { token },
    data: { 
      voteCount: newVoteCount,
      used: newVoteCount >= tokenRecord.maxVotes,
    },
  });

  const tokenWithPoll = await db.token.findUnique({
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

  const answers = responses.reduce((acc, [key, value]) => {
    const questionId = parseInt(key.replace("question_", ""));
    const question = tokenWithPoll?.poll.questions.find((q: any) => q.id === questionId);
    
    if (!question) return acc;

    if (typeof value !== "string") return acc;

    if (question.answerType === "rating") {
      acc[questionId] = { value };
    } else if (question.answerType === "multirangeslider") {
      const parts = value.split(",");
      acc[questionId] = {
        likelihood: parseInt(parts[0]),
        consequences: parseInt(parts[1]),
      };
    } else if (question.answerType === "textarea") {
      acc[questionId] = { value };
    } else {
      const option = question.options.find((o: any) => o.id === parseInt(value));
      if (option) {
        acc[questionId] = { option: option.text };
      }
    }

    return acc;
  }, {} as Record<number, any>);

  return NextResponse.json({ 
    success: true, 
    message: "Vote submitted successfully",
    answers,
  });
}
