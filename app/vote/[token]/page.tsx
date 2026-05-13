import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import VoteLanding from "./VoteLanding";

export default async function VotePage({ params }: { params: Promise<{ token: string }> }) {
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
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-3xl font-bold text-zinc-900">Invalid Link</h2>
          <p className="text-zinc-600">The voting link you provided is not valid.</p>
          <a href="/" className="inline-block bg-zinc-900 text-white px-6 py-2 rounded-md hover:bg-zinc-800 transition-colors">
            Return Home
          </a>
        </div>
      </div>
    );
  }

  if (tokenRecord.used) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-3xl font-bold text-green-600">Vote Already Submitted</h2>
          <p className="text-zinc-600">This voting link has already been used.</p>
          <a href="/" className="inline-block bg-zinc-900 text-white px-6 py-2 rounded-md hover:bg-zinc-800 transition-colors">
            Return Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <VoteLanding poll={tokenRecord.poll} token={token} />
  );
}
