"use client";

import { useState, useEffect } from "react";

interface SuccessPageClientProps {
  token: string;
  answers: Record<number, any>;
}

export default function SuccessPageClient({ token, answers }: SuccessPageClientProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [poll, setPoll] = useState<any>(null);
  const [loadedAnswers, setLoadedAnswers] = useState<Record<number, any>>(answers);
  
  useEffect(() => {
    const pollDataStr = localStorage.getItem(`poll_data_${token}`);
    if (pollDataStr) {
      const poll = JSON.parse(pollDataStr);
      setPoll(poll);
    }
  }, [token]);

  if (!poll) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-3xl font-bold text-zinc-900">Vote Submitted</h2>
          <p className="text-zinc-600">Thank you for your feedback!</p>
        </div>
      </div>
    );
  }

  const hasAnswers = Object.keys(loadedAnswers).length > 0;
  
  if (!hasAnswers) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-3xl font-bold text-zinc-900">Vote Submitted</h2>
          <p className="text-zinc-600">Thank you for your feedback!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-8">
      <div className="max-w-3xl w-full bg-white rounded-lg shadow-sm p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-green-600 mb-2">Vote Successfully Submitted</h2>
          <p className="text-zinc-600">Thank you for your feedback!</p>
        </div>

        <div className="space-y-4">
          {poll.questions.map((question: any) => {
            const answer = loadedAnswers[question.id];
            if (!answer) return null;

            return (
              <div key={question.id} className="border border-zinc-200 rounded-lg p-6">
                <h3 className="font-semibold text-zinc-900 mb-4">{question.text}</h3>
                
                {question.answerType === "rating" && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-700">Rating:</span>
                    <span className="inline-block bg-zinc-900 text-white px-3 py-1 rounded text-sm font-medium">
                      {answer.value} / 10
                    </span>
                  </div>
                )}

                {question.answerType === "multirangeslider" && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-700">Likelihood:</span>
                      <span className="inline-block bg-zinc-900 text-white px-3 py-1 rounded text-sm font-medium">
                        {answer.likelihood} / 5
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-700">Consequences:</span>
                      <span className="inline-block bg-zinc-900 text-white px-3 py-1 rounded text-sm font-medium">
                        {answer.consequences} / 5
                      </span>
                    </div>
                  </div>
                )}

                {question.answerType === "textarea" && (
                  <div className="mt-2">
                    <span className="font-medium text-zinc-700 block mb-2">Answer:</span>
                    <p className="text-zinc-800 whitespace-pre-wrap">{answer.value}</p>
                  </div>
                )}

                {(question.answerType === "default" || !question.answerType) && answer.option && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-700">Selected:</span>
                    <span className="text-zinc-900">{answer.option}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>


      </div>
    </div>
  );
}
