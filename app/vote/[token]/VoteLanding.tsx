"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FormattedHtml from "./FormattedHtml";

interface VoteLandingProps {
  poll: any;
  token: string;
}

export default function VoteLanding({ poll, token }: VoteLandingProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartVote = () => {
    router.push(`/vote/${token}/questions`);
  };

  const handleSubmitVote = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/vote/${token}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        window.location.href = `/vote/${token}/success`;
      } else {
        const data = await response.json();
        setError(data.error || "Failed to submit vote");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-sm p-8">
        <div className="mb-8">
          {poll.imageUrl && (
            <div className="mb-4 rounded-lg overflow-hidden">
              <img src={poll.imageUrl} alt={poll.title} className="w-full h-auto rounded-lg" />
            </div>
          )}
          <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-3">{poll.title}</h1>
          {poll.description && (
            <FormattedHtml html={poll.description} className="text-lg text-zinc-600" />
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-zinc-50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-zinc-900 mb-4">How it works</h2>
            <ul className="space-y-3 text-zinc-600">
              <li className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-900 text-white flex items-center justify-center text-sm font-medium">1</span>
                <span>Review all questions carefully</span>
              </li>
              <li className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-900 text-white flex items-center justify-center text-sm font-medium">2</span>
                <span>Answer each question on separate pages</span>
              </li>
              <li className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-900 text-white flex items-center justify-center text-sm font-medium">3</span>
                <span>Submit your vote to complete</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              type="button"
              onClick={handleStartVote}
              disabled={submitting}
              className="flex-1 bg-zinc-900 text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Voting
            </button>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-zinc-200 text-center">
          <p className="text-sm text-zinc-500">
            Your vote is secret and will be counted anonymously.
          </p>
        </div>
      </div>
    </div>
  );
}
