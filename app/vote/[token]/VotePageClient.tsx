"use client";

import { useState, useEffect } from "react";

interface VotePageClientProps {
  poll: any;
  token: string;
}

interface Answers {
  [questionId: number]: {
    value: string | number | null;
    answered: boolean;
  };
}

export default function VotePageClient({ poll, token }: VotePageClientProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>(() => {
    const defaults: Answers = {};
    poll.questions
      .filter((q: any) => q.answerType === "multirangeslider")
      .forEach((q: any) => {
        defaults[q.id] = { value: "3,3", answered: true };
      });
    return defaults;
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const questions = poll.questions.filter((q: any) => {
    if (q.answerType === "default" || !q.answerType) {
      return q.options.length > 0;
    }
    return true;
  });

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

useEffect(() => {
     const savedAnswers = sessionStorage.getItem(`poll_answers_${token}`);
     if (savedAnswers) {
       try {
         const parsed = JSON.parse(savedAnswers);
         const filteredAnswers: Answers = {};
         Object.keys(parsed).forEach((key: string) => {
           const saved = parsed[key];
           if (saved?.answered) {
             filteredAnswers[parseInt(key)] = saved;
           }
         });
         if (Object.keys(filteredAnswers).length > 0) {
           setAnswers(prev => ({ ...prev, ...filteredAnswers }));
         }
       } catch (e) {
         console.error("Failed to parse saved answers");
       }
     }
   }, [token]);

  const saveAnswer = (questionId: number, value: string | number | null) => {
    setAnswers(prev => {
      const newAnswers = { ...prev, [questionId]: { value, answered: true } };
      sessionStorage.setItem(`poll_answers_${token}`, JSON.stringify(newAnswers));
      return newAnswers;
    });
  };

  const clearAnswer = (questionId: number) => {
    setAnswers(prev => {
      const newAnswers = { ...prev };
      delete newAnswers[questionId];
      sessionStorage.setItem(`poll_answers_${token}`, JSON.stringify(newAnswers));
      return newAnswers;
    });
  };

  const handleNext = () => {
    if (currentQuestion.answerType === "textarea") {
      const textarea = document.querySelector(`textarea[name="question_${currentQuestion.id}"]`) as HTMLTextAreaElement;
      if (textarea && !textarea.value.trim()) {
        setError("Please provide an answer");
        return;
      }
      if (textarea) {
        saveAnswer(currentQuestion.id, textarea.value);
      }
    } else if (currentQuestion.answerType === "rating") {
      const slider = document.querySelector(`input[name="question_${currentQuestion.id}"]`) as HTMLInputElement;
      if (slider) {
        saveAnswer(currentQuestion.id, parseInt(slider.value));
      }
    } else if (currentQuestion.answerType === "multirangeslider") {
      const likelihood = (document.querySelector(`input[name="question_${currentQuestion.id}_likelihood"]`) as HTMLInputElement)?.value;
      const consequences = (document.querySelector(`input[name="question_${currentQuestion.id}_consequences"]`) as HTMLInputElement)?.value;
      if (likelihood && consequences) {
        saveAnswer(currentQuestion.id, `${likelihood},${consequences}`);
      }
    } else {
      setError(null);
      if (isLastQuestion) {
        handleSubmit();
      } else {
        setCurrentQuestionIndex(prev => prev + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append("token", token);

    const submitAnswers = { ...answers };

    poll.questions
      .filter((q: any) => q.answerType === "multirangeslider")
      .forEach((q: any) => {
        if (!submitAnswers[q.id]) {
          submitAnswers[q.id] = { value: "3,3", answered: true };
        }
      });

    for (const [questionId, answer] of Object.entries(submitAnswers)) {
      if (answer.answered && answer.value !== null) {
        if (currentQuestion.answerType === "rating" || typeof answer.value === "number") {
          formData.append(`question_${questionId}`, answer.value.toString());
        } else {
          formData.append(`question_${questionId}`, answer.value);
        }
      }
    }

    try {
      const response = await fetch(`/api/vote/${token}/submit`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        sessionStorage.removeItem(`poll_answers_${token}`);
        window.location.href = "/";
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

  const handleSliderChange = (value: string) => {
    saveAnswer(currentQuestion.id, parseInt(value));
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4 md:p-8">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-sm p-6 md:p-8">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-2">{poll.title}</h1>
          {poll.description && (
            <p className="text-zinc-600">{poll.description}</p>
          )}
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-sm text-zinc-500 mb-2">
            <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
          </div>
          <div className="w-full bg-zinc-200 rounded-full h-2">
            <div 
              className="bg-zinc-900 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="space-y-6 mb-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          <h3 className="text-lg md:text-xl font-semibold text-zinc-900">{currentQuestion.text}</h3>
          
          <input type="hidden" name="token" value={token} />

          {currentQuestion.answerType === "textarea" ? (
            <textarea
              name={`question_${currentQuestion.id}`}
              rows={4}
              className="block w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-zinc-500 focus:border-zinc-500 sm:text-sm text-zinc-700"
              placeholder="Type your answer here..."
              defaultValue={answers[currentQuestion.id]?.value || ""}
              onChange={(e) => saveAnswer(currentQuestion.id, e.target.value)}
            />
          ) : currentQuestion.answerType === "rating" ? (
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="range"
                  name={`question_${currentQuestion.id}`}
                  min="0"
                  max="10"
                  defaultValue={answers[currentQuestion.id]?.value ?? 5}
                  onChange={(e) => handleSliderChange(e.target.value)}
                  className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-zinc-500 mt-2">
                  <span>0</span>
                  <span>5</span>
                  <span>10</span>
                </div>
              </div>
              <div className="text-center">
                <span className="inline-block bg-zinc-900 text-white px-3 py-1 rounded text-sm font-medium">
                  {answers[currentQuestion.id]?.value ?? 5} / 10
                </span>
              </div>
            </div>
          ) : currentQuestion.answerType === "multirangeslider" ? (
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-zinc-700 mb-2 block">Likelihood</label>
<input
                  key={`likelihood-${token}-${currentQuestion.id}`}
                  type="range"
                  name={`question_${currentQuestion.id}_likelihood`}
                   min="0"
                   max="5"
                  value={answers[currentQuestion.id]?.value ? String(answers[currentQuestion.id].value).split(",")[0] : "0"}
                   onChange={(e) => {
                     const parts = String(answers[currentQuestion.id]?.value || "0,0").split(",");
                     parts[0] = e.target.value;
                    saveAnswer(currentQuestion.id, parts.join(","));
                  }}
                  className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-zinc-500 mt-1">
                  <span>0 No vote</span>
                  <span>1 Not likely</span>
                  <span>2 Low likely</span>
                  <span>3 Likely</span>
                  <span>4 Highly likely</span>
                  <span>5 Near certainty</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-700 mb-2 block">Consequences</label>
<input
                  key={`consequences-${currentQuestion.id}`}
                  type="range"
                  name={`question_${currentQuestion.id}_consequences`}
                   min="0"
                   max="5"
                  value={answers[currentQuestion.id]?.value ? String(answers[currentQuestion.id].value).split(",")[1] : "0"}
                   onChange={(e) => {
                     const parts = String(answers[currentQuestion.id]?.value || "0,0").split(",");
                     parts[1] = e.target.value;
                    saveAnswer(currentQuestion.id, parts.join(","));
                  }}
                  className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-zinc-500 mt-1">
                  <span>0 No vote</span>
                  <span>1 Minimal</span>
                  <span>2 Minor</span>
                  <span>3 Medium</span>
                  <span>4 Major</span>
                  <span>5 Critical</span>
                </div>
              </div>
               <div className="text-center">
                 <span className="inline-block bg-zinc-900 text-white px-3 py-1 rounded text-sm font-medium">
                   Likelihood: {String(answers[currentQuestion.id]?.value ?? "0,0").split(",")[0]} / Consequences: {String(answers[currentQuestion.id]?.value ?? "0,0").split(",")[1]}
                 </span>
               </div>
            </div>
          ) : (
            <div className="space-y-3">
              {currentQuestion.options.map((option: any) => {
                const savedValue = answers[currentQuestion.id]?.value;
                
                return (
                  <label key={option.id} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name={`question_${currentQuestion.id}`}
                      value={option.id}
                      defaultChecked={savedValue === option.id.toString()}
                      onChange={() => saveAnswer(currentQuestion.id, option.id)}
                      className="h-4 w-4 text-zinc-900 border-zinc-300 focus:ring-zinc-600"
                    />
                    <span className="text-zinc-700">{option.text}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-zinc-200">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentQuestionIndex === 0 || submitting}
            className="w-full sm:w-auto px-6 py-3 rounded-md text-sm font-medium text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={submitting}
            className="w-full sm:w-auto bg-zinc-900 text-white px-6 py-3 rounded-md text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLastQuestion ? "Submit Vote" : "Next"}
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-zinc-200 text-center">
          <p className="text-sm text-zinc-500">
            Your vote is secret and will be counted anonymously.
          </p>
        </div>
      </div>
    </div>
  );
}
