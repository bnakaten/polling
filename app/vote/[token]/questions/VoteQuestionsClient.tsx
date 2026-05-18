"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface VoteQuestionsClientProps {
  poll: any;
  token: string;
}

interface Answers {
  [questionId: number]: {
    value: string | number | null;
    answered: boolean;
  };
}

export default function VoteQuestionsClient({ poll, token }: VoteQuestionsClientProps) {
  const router = useRouter();
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
  const [answersLoaded, setAnswersLoaded] = useState(false);
  const likelihoodRef = useRef<HTMLInputElement>(null);
  const consequencesRef = useRef<HTMLInputElement>(null);

  const questions = poll.questions.filter((q: any) => {
    if (q.answerType === "default" || !q.answerType) {
      return q.options.length > 0;
    }
    return true;
  });

  const goBackToLanding = () => {
    router.push(`/vote/${token}`);
  };

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = questions.length > 0 && currentQuestionIndex === questions.length - 1;

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4 md:p-8">
        <div className="max-w-2xl w-full bg-white rounded-lg shadow-sm p-6 md:p-8 text-center">
          <h2 className="text-2xl font-bold text-zinc-900 mb-4">No questions available</h2>
          <p className="text-zinc-600 mb-6">This poll does not have any questions to answer.</p>
          <button
            type="button"
            onClick={goBackToLanding}
            className="px-6 py-3 bg-zinc-900 text-white rounded-md text-sm font-medium hover:bg-zinc-800 transition-colors"
          >
            Back to Poll
          </button>
        </div>
      </div>
    );
  }

  useEffect(() => {
    const savedAnswers = sessionStorage.getItem(`poll_answers_${token}`);
    if (savedAnswers) {
      try {
        const parsed = JSON.parse(savedAnswers);
        setAnswers(prev => ({ ...prev, ...parsed }));
        setAnswersLoaded(true);
      } catch (e) {
        console.error("Failed to parse saved answers");
        setAnswersLoaded(true);
      }
    } else {
      const initialAnswers: Record<number, { value: string | number | null; answered: boolean }> = {};
      questions.forEach((question: any) => {
        if (question.answerType === "rating") {
          initialAnswers[question.id] = { value: 5, answered: false };
        } else if (question.answerType === "multirangeslider") {
          initialAnswers[question.id] = { value: "3,3", answered: true };
        }
      });
      setAnswers(initialAnswers);
    }
  }, [token]);

  useEffect(() => {
    console.log("Effect: token or currentQuestionIndex changed", { token, currentQuestionIndex, questionId: currentQuestion.id });
    const savedAnswers = sessionStorage.getItem(`poll_answers_${token}`);
    if (savedAnswers) {
      try {
        const parsed = JSON.parse(savedAnswers);
        console.log("Parsed saved answers:", parsed);
        const currentSaved = parsed[currentQuestion.id];
        console.log("Current question saved answer:", currentSaved);
        if (currentSaved && currentQuestion.answerType === "multirangeslider") {
          setAnswers(prev => ({ ...prev, [currentQuestion.id]: currentSaved }));
        }
      } catch (e) {
        console.error("Failed to parse saved answers for current question", e);
      }
    }
  }, [token, currentQuestionIndex]);

   useLayoutEffect(() => {
    if (currentQuestion.answerType === "multirangeslider" && likelihoodRef.current && consequencesRef.current) {
      const saved = String(answers[currentQuestion.id]?.value ?? "3,3");
      const parts = saved.split(",");
      const likelihoodVal = parseInt(parts[0]) || 3;
      const consequencesVal = parseInt(parts[1]) || 3;
      
      likelihoodRef.current.value = String(likelihoodVal);
      consequencesRef.current.value = String(consequencesVal);
      
      console.log("useLayoutEffect: Set slider DOM values for", currentQuestion.id, ":", likelihoodVal, ",", consequencesVal);
    } else if (currentQuestion.answerType === "rating" && answersLoaded) {
      const savedValue = answers[currentQuestion.id]?.value ?? 5;
      const slider = document.querySelector(`input[name="question_${currentQuestion.id}"]`) as HTMLInputElement;
      if (slider) {
        slider.value = String(savedValue);
        console.log("useLayoutEffect: Set rating slider DOM value for", currentQuestion.id, ":", savedValue);
      }
    }
  }, [currentQuestionIndex, currentQuestion.id, answersLoaded]);

  const saveAnswer = (questionId: number, value: string | number | null) => {
    setAnswers(prev => {
      const newAnswers = { ...prev, [questionId]: { value, answered: true } };
      sessionStorage.setItem(`poll_answers_${token}`, JSON.stringify(newAnswers));
      return newAnswers;
    });
  };

  const handleNext = () => {
    console.log("handleNext called, current question:", currentQuestion.id);
    if (currentQuestion.answerType === "textarea") {
      const textarea = document.querySelector(`textarea[name="question_${currentQuestion.id}"]`) as HTMLTextAreaElement;
      if (textarea && !textarea.value.trim() && !currentQuestion.isOptional) {
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
      const likelihood = document.querySelector(`input[name="question_${currentQuestion.id}_likelihood"]`) as HTMLInputElement;
      const consequences = document.querySelector(`input[name="question_${currentQuestion.id}_consequences"]`) as HTMLInputElement;
      if (likelihood && consequences) {
        const value = `${likelihood.value},${consequences.value}`;
        console.log("Saving multirangeslider answer for", currentQuestion.id, ":", value);
        saveAnswer(currentQuestion.id, value);
      }
    } else {
      const checked = document.querySelector(`input[name="question_${currentQuestion.id}"]:checked`) as HTMLInputElement;
      if (!checked && !currentQuestion.isOptional) {
        setError("Please select an option");
        return;
      }
      if (checked) {
        saveAnswer(currentQuestion.id, checked.value);
      }
    }

    setError(null);
    if (isLastQuestion) {
      handleSubmit();
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
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
        router.push("/");
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

          {currentQuestion.imageUrl && (
            <div className="rounded-lg overflow-hidden">
              <img src={currentQuestion.imageUrl} alt="Question" className="w-full max-h-96 object-cover rounded-lg" />
            </div>
          )}
          <h3 className="text-lg md:text-xl font-semibold text-zinc-900">
            {currentQuestion.category && <span className="block text-sm font-medium text-zinc-500 mb-1">{currentQuestion.category}</span>}
            {currentQuestion.text}
            {currentQuestion.isOptional ? (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-600">
                Optional
              </span>
            ) : (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-600">
                Required
              </span>
            )}
          </h3>
          {currentQuestion.description && currentQuestion.description.trim() !== "" && <p className="text-sm text-zinc-600 mb-6">{currentQuestion.description}</p>}
          
          <input type="hidden" name="token" value={token} />

          {currentQuestion.answerType === "textarea" ? (
            <div className="space-y-1">
              <textarea
                name={`question_${currentQuestion.id}`}
                rows={4}
                className="block w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-zinc-500 focus:border-zinc-500 sm:text-sm text-zinc-700"
                placeholder="Type your answer here..."
                defaultValue={answers[currentQuestion.id]?.value || ""}
                onChange={(e) => saveAnswer(currentQuestion.id, e.target.value)}
              />
              {currentQuestion.isOptional && (
                <p className="text-xs text-zinc-500">Optional — leave empty if you prefer not to answer</p>
              )}
            </div>
          ) : currentQuestion.answerType === "rating" ? (
            <div className="space-y-4">
              <div className="relative">
                  <input
                    type="range"
                    name={`question_${currentQuestion.id}`}
                    min="0"
                    max="10"
                    value={answers[currentQuestion.id]?.value ?? 5}
                    onChange={(e) => handleSliderChange(e.target.value)}
                    className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
                  />
                <div className="flex justify-between text-xs text-zinc-500 mt-2">
                  <span>0</span>
                  <span>5</span>
                  <span>10</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Not at all likely</span>
                <span className="text-xs text-zinc-400">Very likely</span>
              </div>
              <div className="text-center">
                <span className="inline-block bg-zinc-900 text-white px-3 py-1 rounded text-sm font-medium">
                  {answers[currentQuestion.id]?.value ?? 5} / 10
                </span>
                {answers[currentQuestion.id] !== undefined && (
                  <span className="ml-3 text-sm text-zinc-600 font-medium">
                    {["Not at all likely", "Extremely unlikely", "Very unlikely", "Unlikely", "Somewhat unlikely", "Neutral / Neither likely nor unlikely", "Somewhat likely", "Likely", "Very likely", "Extremely likely", "Very likely"][answers[currentQuestion.id]?.value as number ?? 5]}
                  </span>
                )}
              </div>
            </div>
            ) : currentQuestion.answerType === "multirangeslider" ? (
              <div key={`multirange-${currentQuestion.id}`} className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-zinc-700 mb-2 block">Likelihood</label>
                   <input
                     ref={likelihoodRef}
                     key={`likelihood-${currentQuestion.id}`}
                     type="range"
                     name={`question_${currentQuestion.id}_likelihood`}
                     min="1"
                     max="5"
                      defaultValue={(() => {
                        const val = answers[currentQuestion.id]?.value;
                        return val ? parseInt(String(val).split(",")[0]) : 3;
                      })()}
                     onChange={(e) => {
                      const saved = String(answers[currentQuestion.id]?.value ?? "3,3");
                      const parts = saved.split(",");
                      parts[0] = e.target.value;
                      saveAnswer(currentQuestion.id, parts.join(","));
                    }}
                    className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-zinc-500 mt-1">
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
                     ref={consequencesRef}
                     key={`consequences-${currentQuestion.id}`}
                     type="range"
                     name={`question_${currentQuestion.id}_consequences`}
                     min="1"
                     max="5"
                      defaultValue={(() => {
                        const val = answers[currentQuestion.id]?.value;
                        return val ? parseInt(String(val).split(",")[1]) : 3;
                      })()}
                     onChange={(e) => {
                      const saved = String(answers[currentQuestion.id]?.value ?? "3,3");
                      const parts = saved.split(",");
                      parts[1] = e.target.value;
                      saveAnswer(currentQuestion.id, parts.join(","));
                    }}
                    className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-zinc-500 mt-1">
                    <span>1 Minimal</span>
                    <span>2 Minor</span>
                    <span>3 Medium</span>
                    <span>4 Major</span>
                    <span>5 Critical</span>
                  </div>
                </div>
                <div className="text-center">
                  <span className="inline-block bg-zinc-900 text-white px-3 py-1 rounded text-sm font-medium">
                    {(() => {
                      const saved = String(answers[currentQuestion.id]?.value ?? "3,3");
                      const parts = saved.split(",");
                      return `Likelihood: ${parseInt(parts[0]) || 3} / Consequences: ${parseInt(parts[1]) || 3}`;
                    })()}
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
             onClick={goBackToLanding}
             className="mx-auto w-full sm:w-auto px-6 py-3 rounded-md text-sm font-medium text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50 transition-colors"
           >
             Cancel
           </button>

           <button
             type="button"
             onClick={handleNext}
             disabled={submitting}
             className="ml-auto w-full sm:w-auto bg-zinc-900 text-white px-6 py-3 rounded-md text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
