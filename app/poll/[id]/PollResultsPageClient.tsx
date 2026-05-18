"use client";

import { useState } from "react";
import Link from "next/link";
import GenerateTokenForm from "./GenerateTokenForm";
import DownloadCSV from "./DownloadCSV";

interface PollDetails {
  poll: {
    id: number;
    title: string;
    description: string | null;
    tokens: Array<{ token: string; used: boolean }>;
  };
}

interface ResultsData {
  success: boolean;
  poll?: any;
  results?: any[];
}

interface PollResultsPageProps {
  pollId: number;
  initialData: ResultsData;
  initialPollDetails: PollDetails;
}

export default function PollResultsPageClient({ pollId, initialData, initialPollDetails }: PollResultsPageProps) {

  const [showVotingLinks, setShowVotingLinks] = useState(false);
  const [pollDetails, setPollDetails] = useState(initialPollDetails);

  if (!initialData.success) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-zinc-900">Error</h2>
          <p className="text-zinc-600">Failed to load poll results</p>
        </div>
      </div>
    );
  }

  const { poll, results } = initialData;

  return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="bg-zinc-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="text-xl font-bold">Polling Admin</Link>
              <div className="flex space-x-4">
                <Link href="/dashboard" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                  Dashboard
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Logout
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/dashboard"
          className="inline-block text-zinc-600 hover:text-zinc-900 mb-4"
        >
          ← Back to Dashboard
        </Link>

        <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-2xl font-bold text-zinc-900 mb-2">{poll?.title}</h1>
            <DownloadCSV pollId={pollId} pollTitle={poll?.title || ""} includeTokens={true} />
          </div>
          {poll?.description && (
            <p className="text-zinc-600 mb-4">{poll.description}</p>
          )}
          {poll?.imageUrl && (
            <img
              src={poll.imageUrl}
              alt="Poll"
              className="w-full h-auto rounded-lg object-cover mt-4"
            />
          )}

          <div className="mt-8 p-4 bg-zinc-50 rounded-lg border border-zinc-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-zinc-700">Voting Links</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowVotingLinks(!showVotingLinks)}
                  className="text-sm text-zinc-600 hover:text-zinc-900"
                >
                  {showVotingLinks ? "Hide" : "Show"} ({pollDetails.poll?.tokens?.length || 0})
                </button>
                <GenerateTokenForm pollId={pollId} />
              </div>
            </div>
            
            {showVotingLinks && (
              <>
                {pollDetails.poll?.tokens && pollDetails.poll.tokens.length > 0 ? (
                  <div className="space-y-2 mt-4">
                    {pollDetails.poll.tokens.map((token: any) => (
                      <div key={token.token} className="flex items-center justify-between bg-white p-2 rounded border border-zinc-200">
                        <a 
                          href={`https://rfcs.fun:3443/vote/${token.token}`}
                          target="_blank"
                          className="flex-1 text-blue-600 hover:underline break-all text-sm"
                        >
                           https://rfcs.fun:3443/vote/{token.token}
                        </a>
                        {token.voteCount !== undefined && (
                          <span className="text-xs text-zinc-500 px-2 py-1 bg-zinc-100 rounded">
                            {token.voteCount}/{token.maxVotes}
                          </span>
                        )}
                        {token.voteCount >= token.maxVotes && (
                          <span className="text-xs text-red-500 px-2 py-1 bg-red-50 rounded">
                            Expired
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 mt-4">No voting links generated yet.</p>
                )}
              </>
            )}
            <p className="text-xs text-zinc-500 mt-2">
              Share these links with voters. Each vote consumes one link.
            </p>
          </div>

          <div className="space-y-8">
            {results?.map((result: any) => {
              const isTextarea = result.answerType === "textarea";
              const isRating = result.answerType === "rating";
              const maxCount = result.options.reduce((max: number, o: any) => Math.max(max, o.count), 0);
              return (
                <div key={result.questionId} className="border-t border-zinc-200 pt-6">
                  {result.imageUrl && (
                    <img
                      src={result.imageUrl}
                      alt="Question"
                      className="w-full h-auto rounded-lg object-cover mb-4"
                    />
                  )}
                   <h3 className="text-lg font-semibold text-zinc-900 mb-1">
                     {result.category && <span className="block text-sm font-medium text-zinc-500 mb-1">{result.category}</span>}
                     {result.text}
                   </h3>
                   {result.description && <p className="text-sm text-zinc-600 mb-4">{result.description}</p>}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs text-zinc-500 bg-zinc-100 px-2 py-1 rounded">
                      {result.answerType === "textarea" ? "Textarea" : result.answerType === "rating" ? "Rating 0-10" : result.answerType === "multirangeslider" ? "Multi-Range Slider" : "Multiple Choice"}
                    </span>
                    {result.isOptional && (
                      <span className="text-xs text-zinc-500 bg-zinc-100 px-2 py-1 rounded">
                        Optional
                      </span>
                    )}
                  </div>
                     <div className="space-y-3">
                       {result.options.map((option: any, index: number) => (
                        <div key={`${option.optionId}-${index}`}>
                         <div className="flex justify-between mb-1">
                           <span className="text-sm font-medium text-zinc-900">{option.text}</span>
                           <span className="text-sm text-zinc-600">
                             {option.count} vote{option.count !== 1 ? "s" : ""}
                           </span>
                         </div>
                         {!isTextarea && maxCount > 0 && (
                           <div className="w-full bg-zinc-200 rounded-full h-2">
                             <div
                               className="bg-zinc-900 h-2 rounded-full"
                               style={{ width: `${(option.count / maxCount) * 100}%` }}
                             />
                           </div>
                         )}
                       </div>
                     ))}
                    {(isTextarea || isRating) && result.individualResponses && result.individualResponses.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <h4 className="text-sm font-medium text-zinc-900">Responses ({result.individualResponses.length} total):</h4>
                        {result.individualResponses.map((response: string, idx: number) => (
                          <div key={idx} className="bg-zinc-50 p-3 rounded border border-zinc-200 text-sm text-zinc-700">
                            {response}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed top-6 right-6 bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-3 rounded-full shadow-lg transition-all hover:scale-105 flex items-center gap-2 z-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </button>
        </div>
      </main>
    </div>
  );
}
