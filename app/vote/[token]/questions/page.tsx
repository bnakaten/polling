import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import VoteQuestionsClient from "./VoteQuestionsClient";

export default async function VoteQuestionsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  
  const tokenRecord = await db.token.findUnique({
    where: { token },
    include: {
      poll: {
        include: {
          questions: {
            select: {
              id: true,
              text: true,
              category: true,
              description: true,
              answerType: true,
              isOptional: true,
              imageUrl: true,
              options: true,
            },
          },
        },
      },
    },
  });

  if (!tokenRecord) {
    redirect("/");
  }

  if (tokenRecord.used) {
    redirect("/");
  }

  return (
    <VoteQuestionsClient poll={tokenRecord.poll} token={token} />
  );
}
