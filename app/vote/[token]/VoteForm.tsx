"use client";

import { useState, useRef, useEffect } from "react";
import FormattedHtml from "./FormattedHtml";

interface VoteFormProps {
  poll: any;
  token: string;
}

export default function VoteForm({ poll, token }: VoteFormProps) {
  console.log("VoteForm rendered with token:", token, "poll:", poll.title);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [multirangeValues, setMultirangeValues] = useState<Record<number, { likelihood: number; consequences: number }>>({});
  const formRef = useRef<HTMLFormElement>(null);
  
  const ratingQuestionIds = poll.questions
    .filter((q: any) => q.answerType === "rating")
    .map((q: any) => q.id);
  
  const [sliderValues, setSliderValues] = useState<Record<number, number>>(
    ratingQuestionIds.reduce((acc: Record<number, number>, id: number) => {
      acc[id] = 5;
      return acc;
    }, {})
  );

  useEffect(() => {
    const storedValues = localStorage.getItem(`poll_votes_${token}`);
    if (storedValues) {
      try {
        const parsed = JSON.parse(storedValues);
        if (parsed.multirangeValues) {
          setMultirangeValues(parsed.multirangeValues);
        }
      } catch (e) {
        console.error("Failed to parse stored vote values:", e);
      }
    }
  }, [token]);

  const handleSliderChange = (questionId: number, value: string) => {
    setSliderValues(prev => ({ ...prev, [questionId]: parseInt(value) }));
  };

  const setMultirangesliderValue = (questionId: number, likelihood: string, consequences: string) => {
    const formElement = formRef.current;
    if (formElement) {
      const hiddenInput = formElement.querySelector(`input[name="question_${questionId}"]`) as HTMLInputElement;
      if (hiddenInput) hiddenInput.value = `${likelihood},${consequences}`;
    }
  };

  const handleMultiRangeChange = (questionId: number, likelihood: number, consequences: number) => {
    setMultirangeValues(prev => ({ ...prev, [questionId]: { likelihood, consequences } }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    // Explicitly collect and set multirangeslider values from sliders
    const multirangesliderQuestions = poll.questions.filter((q: any) => q.answerType === "multirangeslider");
    multirangesliderQuestions.forEach((question: any) => {
      const likelihood = form.querySelector(`input[name="question_${question.id}_likelihood"]`) as HTMLInputElement;
      const consequences = form.querySelector(`input[name="question_${question.id}_consequences"]`) as HTMLInputElement;
      if (likelihood && consequences) {
        const value = `${likelihood.value || "3"},${consequences.value || "3"}`;
        formData.set(`question_${question.id}`, value);
        console.log(`Setting question_${question.id} to "${value}"`);
      }
    });
    
    // Debug: log all textarea values
    formData.forEach((value, key) => {
      if (key.startsWith("question_")) {
        console.log(`Submitting ${key}: "${value}"`);
      }
    });
    
    const multirangeValuesString = JSON.stringify({ multirangeValues });
    localStorage.setItem(`poll_votes_${token}`, multirangeValuesString);

    formData.append("token", token);

    try {
      const response = await fetch(`/api/vote/${token}/submit`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setSuccess(true);
        // Redirect to home page to prevent form re-submission
        setTimeout(() => {
          window.location.href = "/";
        }, 1500);
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

  if (success) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-3xl font-bold text-green-600">Vote Submitted</h2>
          <p className="text-zinc-600">Thank you for your vote!</p>
          <a href="/" className="inline-block bg-zinc-900 text-white px-6 py-2 rounded-md hover:bg-zinc-800 transition-colors">
            Return Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-sm p-8">
        <h1 className="text-3xl font-bold text-zinc-900 mb-2">{poll.title}</h1>
        {poll.description && (
          <FormattedHtml html={poll.description} className="text-zinc-700 mb-6 text-base" />
        )}

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}
          
           <input type="hidden" name="token" value={token} />
           
              {poll.questions.map((question: any) => {
                console.log("Processing question", question.id, "type:", question.answerType, "options:", question.options?.length || 0);
                const needsOptions = question.answerType === "default" || !question.answerType;
                const hasOptions = needsOptions ? question.options.length > 0 : true;
                
                console.log("  needsOptions:", needsOptions, "hasOptions:", hasOptions, "imageUrl:", question.imageUrl);
                
                if (!hasOptions && !question.imageUrl) {
                  console.log("  Skipping question - no options and no image");
                  return null;
                }
                
                const multirangesliderDefaults = question.answerType === "multirangeslider" ? (
                  <input type="hidden" name={`question_${question.id}`} defaultValue={`${multirangeValues[question.id]?.likelihood ?? 3},${multirangeValues[question.id]?.consequences ?? 3}`} />
                ) : null;
                
                return (
                <div key={question.id} className="space-y-3">
                   {question.imageUrl && (
                     <div className="rounded-lg overflow-hidden mb-2">
                       <img src={question.imageUrl} alt="Question" className="w-full max-h-96 object-cover rounded-lg" />
                     </div>
                   )}
                     <h3 className="text-xl font-semibold text-zinc-900">{question.category && <span className="block text-base font-medium text-zinc-600">{question.category}</span>}{question.text}</h3>
                      {question.description && <FormattedHtml html={question.description} className="text-zinc-700 mb-4" />}
                    {multirangesliderDefaults}
                 
                    {question.answerType === "textarea" ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <textarea
                            name={`question_${question.id}`}
                            rows={4}
                            required={!question.isOptional}
                            className={`block w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-zinc-500 focus:border-zinc-500 sm:text-sm text-zinc-700 ${question.isOptional ? 'border-zinc-300' : 'border-zinc-900'}`}
                            placeholder="Type your answer here..."
                            style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}
                          />
                        </div>
                       {question.isOptional && (
                         <p className="text-xs text-zinc-500">Optional — leave empty if you prefer not to answer</p>
                       )}
                     </div>
                   ) : question.answerType === "rating" ? (
                     <div className="flex gap-6 items-start">
                       <div className="flex-1 space-y-2">
                         <div className="relative">
<input
                              type="range"
                              name={`question_${question.id}`}
                              min="0"
                              max="10"
                              value={sliderValues[question.id] ?? 5}
                              required
                              onChange={(e) => handleSliderChange(question.id, e.target.value)}
                              className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
                            />
                           <div className="flex justify-between text-xs text-zinc-500">
                             <span>0</span>
                             <span>5</span>
                             <span>10</span>
                           </div>
                         </div>
                         <div className="text-center">
                           <span className="inline-block bg-zinc-900 text-white px-3 py-1 rounded text-sm font-medium">
                             {sliderValues[question.id] ?? 5} / 10
                           </span>
                         </div>
                       </div>
                       <div className="flex flex-col justify-between h-24 py-1">
                         <div className="text-xs text-zinc-400 text-right leading-tight">10 — applies</div>
                         <div className="w-px h-full bg-gradient-to-b from-zinc-300 via-zinc-200 to-zinc-300 rounded-full mx-auto" />
                         <div className="text-xs text-zinc-400 text-right leading-tight">0 — does not apply</div>
                       </div>
                     </div>
                     ) : question.answerType === "multirangeslider" ? (
                       <div className="space-y-6">
                         <div>
                           <label className="text-sm font-medium text-zinc-700 mb-2 block">Likelihood</label>
                           <input
                             type="range"
                             name={`question_${question.id}_likelihood`}
                             min="1"
                             max="5"
                             value={multirangeValues[question.id]?.likelihood ?? 3}
                             onChange={(e) => {
                               const likelihood = parseInt(e.target.value);
                               const consequences = multirangeValues[question.id]?.consequences ?? 3;
                               handleMultiRangeChange(question.id, likelihood, consequences);
                               const formElement = formRef.current;
                               if (formElement) {
                                 const hiddenInput = formElement.querySelector(`input[name="question_${question.id}"]`) as HTMLInputElement;
                                 if (hiddenInput) hiddenInput.value = `${likelihood},${consequences}`;
                               }
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
                             type="range"
                             name={`question_${question.id}_consequences`}
                             min="1"
                             max="5"
                             value={multirangeValues[question.id]?.consequences ?? 3}
                             onChange={(e) => {
                               const likelihood = multirangeValues[question.id]?.likelihood ?? 3;
                               const consequences = parseInt(e.target.value);
                               handleMultiRangeChange(question.id, likelihood, consequences);
                               const formElement = formRef.current;
                               if (formElement) {
                                 const hiddenInput = formElement.querySelector(`input[name="question_${question.id}"]`) as HTMLInputElement;
                                 if (hiddenInput) hiddenInput.value = `${likelihood},${consequences}`;
                               }
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
                             <span className="likelihood-value">{multirangeValues[question.id]?.likelihood ?? 3}</span> / <span className="consequences-value">{multirangeValues[question.id]?.consequences ?? 3}</span>
                           </span>
                         </div>
                       </div>
                     ) : (
                    <div className="space-y-2">
                      {question.options.map((option: any) => (
                        <label key={option.id} className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="radio"
                            name={`question_${question.id}`}
                            value={option.id}
                            required
                            className="h-4 w-4 text-zinc-900 border-zinc-300 focus:ring-zinc-600"
                          />
                          <span className="text-zinc-700">{option.text}</span>
                        </label>
                      ))}
                    </div>
                  )}
               </div>
             );
          })}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-zinc-900 text-white px-6 py-3 rounded-md text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting..." : "Submit Vote"}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-zinc-200 text-center">
          <p className="text-sm text-zinc-500">
            Your vote is secret and will be counted anonymously.
          </p>
        </div>
      </div>
    </div>
  );
}
