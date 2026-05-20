"use client";

import { useState } from "react";

interface SuccessPageClientProps {
  token: string;
  answers: Record<number, any>;
}

export default function SuccessPageClient({ token, answers }: SuccessPageClientProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  
  const pollDataStr = localStorage.getItem(`poll_data_${token}`);
  const poll = pollDataStr ? JSON.parse(pollDataStr) : null;

  if (!poll) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-3xl font-bold text-zinc-900">Vote Submitted</h2>
          <p className="text-zinc-600">Thank you for your feedback!</p>
          <a href="/" className="inline-block bg-zinc-900 text-white px-6 py-3 rounded-md hover:bg-zinc-800 transition-colors">
            Return Home
          </a>
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
          {poll.questions.map((question: any, index: number) => {
            const answer = answers[question.id];
            if (!answer) return null;

            return (
              <div key={question.id} className="border border-zinc-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full px-6 py-4 text-left bg-zinc-50 hover:bg-zinc-100 transition-colors flex justify-between items-center"
                >
                  <span className="font-semibold text-zinc-900">{question.text}</span>
                  <span className={`transform transition-transform ${openIndex === index ? "rotate-180" : ""}`}>
                    ▼
                  </span>
                </button>
                
                <div className={`transition-all duration-300 ease-in-out ${openIndex === index ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
                  <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50">
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
                      <div className="bg-white border border-zinc-200 rounded-md p-3">
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
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <a
            href="/"
            className="inline-block bg-zinc-900 text-white px-6 py-3 rounded-md hover:bg-zinc-800 transition-colors"
          >
            Return Home
          </a>
        </div>
      </div>
    </div>
  );
}
