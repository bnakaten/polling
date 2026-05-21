"use client";

import { useState, useRef, useEffect } from "react";
import FormattedHtml from "./FormattedHtml";
import SuccessPage from "./SuccessPage";

interface VoteFormProps {
  poll: any;
  token: string;
}

export default function VoteForm({ poll, token }: VoteFormProps) {
  console.log("VoteForm rendered with token:", token, "poll:", poll.title);
  const [submitting, setSubmitting] = useState(false);
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

  const [submittedAnswers, setSubmittedAnswers] = useState<Record<number, any>>({});
  const [textareaInteracted, setTextareaInteracted] = useState<Record<number, boolean>>({});
  const [ratingInteracted, setRatingInteracted] = useState<Record<number, boolean>>({});
  const [multirangeInteracted, setMultirangeInteracted] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const storedValues = localStorage.getItem(`poll_votes_${token}`);
    if (storedValues) {
      try {
        const parsed = JSON.parse(storedValues);
        if (parsed.multirangeValues) {
          const parsedValues = parsed.multirangeValues;
          Object.keys(parsedValues).forEach((key: string) => {
            const questionId = parseInt(key);
            const value = parsedValues[questionId];
            if (value) {
              parsedValues[questionId] = {
                likelihood: value.likelihood ?? 0,
                consequences: value.consequences ?? 0
              };
            }
          });
          setMultirangeValues(parsedValues);
        }
      } catch (e) {
        console.error("Failed to parse stored vote values:", e);
      }
    }
  }, [token]);

  useEffect(() => {
    if (submittedAnswers && Object.keys(submittedAnswers).length > 0) {
      localStorage.removeItem(`poll_votes_${token}`);
    }
  }, [submittedAnswers, token]);

  const handleSliderChange = (questionId: number, value: string) => {
    setSliderValues(prev => ({ ...prev, [questionId]: parseInt(value) }));
    setRatingInteracted(prev => ({ ...prev, [questionId]: true }));
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
    setMultirangeInteracted(prev => ({ ...prev, [questionId]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const newAnswers: Record<number, any> = {};
    
    poll.questions.forEach((q: any) => {
      if (q.answerType === "rating") {
        const value = sliderValues[q.id];
        if (value !== undefined) {
          newAnswers[q.id] = { value };
        }
      } else if (q.answerType === "multirangeslider") {
        const value = multirangeValues[q.id];
        if (value) {
          newAnswers[q.id] = {
            likelihood: value.likelihood,
            consequences: value.consequences,
          };
        }
      } else if (q.answerType === "textarea") {
        const textarea = form.querySelector(`textarea[name="question_${q.id}"]`) as HTMLTextAreaElement;
        if (textarea && textarea.value) {
          newAnswers[q.id] = { value: textarea.value };
        }
      } else {
        const radio = form.querySelector(`input[name="question_${q.id}"]:checked`) as HTMLInputElement;
        if (radio) {
          const option = q.options.find((o: any) => o.id === parseInt(radio.value));
          if (option) {
            newAnswers[q.id] = { option: option.text };
          }
        }
      }
    });
    
    // Debug: log all form data before modifications
    console.log("=== Form Data Before Modifications ===");
    formData.forEach((value, key) => {
      if (key.startsWith("question_")) {
        console.log(`  ${key}: "${value}"`);
      }
    });
    
    // Explicitly collect and set multirangeslider values from sliders
    const multirangesliderQuestions = poll.questions.filter((q: any) => q.answerType === "multirangeslider");
    multirangesliderQuestions.forEach((question: any) => {
      const likelihood = form.querySelector(`input[name="question_${question.id}_likelihood"]`) as HTMLInputElement;
      const consequences = form.querySelector(`input[name="question_${question.id}_consequences"]`) as HTMLInputElement;
      if (likelihood && consequences) {
        const value = `${likelihood.value || "0"},${consequences.value || "0"}`;
        
        if (question.isOptional && !multirangeInteracted[question.id] && value === "0,0") {
          formData.set(`question_${question.id}`, "skipped");
          console.log(`Setting question_${question.id} to "skipped" (optional, not interacted)`);
        } else {
          formData.set(`question_${question.id}`, value);
          console.log(`Setting question_${question.id} to "${value}"`);
        }
      }
    });
    
    // Handle optional multiple choice questions that were skipped
    const multipleChoiceQuestions = poll.questions.filter((q: any) => q.answerType === "default" || !q.answerType);
    multipleChoiceQuestions.forEach((question: any) => {
      if (question.isOptional) {
        const radio = form.querySelector(`input[name="question_${question.id}"]:checked`) as HTMLInputElement;
        if (!radio) {
          formData.set(`question_${question.id}`, "skipped");
          console.log(`Setting question_${question.id} to "skipped" (optional multiple choice, not selected)`);
        }
      }
    });
    
    // Handle optional textarea questions that were skipped
    const textareaQuestions = poll.questions.filter((q: any) => q.answerType === "textarea");
    textareaQuestions.forEach((question: any) => {
      if (question.isOptional) {
        const textarea = form.querySelector(`textarea[name="question_${question.id}"]`) as HTMLTextAreaElement;
        if (textarea && textarea.value === "") {
          formData.set(`question_${question.id}`, "skipped");
          console.log(`Setting question_${question.id} to "skipped" (optional, empty)`);
        }
      }
    });
    
    // Handle optional rating questions that were skipped
    const ratingQuestions = poll.questions.filter((q: any) => q.answerType === "rating");
    ratingQuestions.forEach((question: any) => {
      if (question.isOptional) {
        const slider = form.querySelector(`input[name="question_${question.id}"]`) as HTMLInputElement;
        if (slider && slider.value === "5") {
          formData.set(`question_${question.id}`, "skipped");
          console.log(`Setting question_${question.id} to "skipped" (optional, default value)`);
        }
      }
    });
    
    // Debug: log all form data after modifications
    console.log("=== Form Data After Modifications ===");
    formData.forEach((value, key) => {
      if (key.startsWith("question_")) {
        console.log(`  ${key}: "${value}"`);
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

    localStorage.setItem(`poll_data_${token}`, JSON.stringify(poll));

    try {
      const response = await fetch(`/api/vote/${token}/submit`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const answersParam = encodeURIComponent(JSON.stringify(data.answers));
        window.location.href = `/vote/${token}/success?answers=${answersParam}`;
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
                  <input type="hidden" name={`question_${question.id}`} defaultValue={`${multirangeValues[question.id]?.likelihood ?? 0},${multirangeValues[question.id]?.consequences ?? 0}`} />
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
                            onChange={() => setTextareaInteracted(prev => ({ ...prev, [question.id]: true }))}
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
                               onChange={(e) => {
                                 handleSliderChange(question.id, e.target.value);
                                 setRatingInteracted(prev => ({ ...prev, [question.id]: true }));
                               }}
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
                              min="0"
                              max="5"
                              value={multirangeValues[question.id]?.likelihood ?? 0}
                              onChange={(e) => {
                                const likelihood = parseInt(e.target.value);
                                const consequences = multirangeValues[question.id]?.consequences ?? 0;
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
                              <span>0 Not likely</span>
                              <span>2 Low likely</span>
                              <span>4 Likely</span>
                              <span>5 Near certainty</span>
                            </div>
                         </div>
                         <div>
                           <label className="text-sm font-medium text-zinc-700 mb-2 block">Consequences</label>
                           <input
                             type="range"
                             name={`question_${question.id}_consequences`}
                              min="0"
                              max="5"
                              value={multirangeValues[question.id]?.consequences ?? 0}
                              onChange={(e) => {
                                const likelihood = multirangeValues[question.id]?.likelihood ?? 0;
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
                              <span>0 Minimal</span>
                              <span>2 Minor</span>
                              <span>4 Major</span>
                              <span>5 Critical</span>
                            </div>
                         </div>
                         <div className="text-center">
                           <span className="inline-block bg-zinc-900 text-white px-3 py-1 rounded text-sm font-medium">
                              <span className="likelihood-value">{multirangeValues[question.id]?.likelihood ?? 0}</span> / <span className="consequences-value">{multirangeValues[question.id]?.consequences ?? 0}</span>
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
                             required={!question.isOptional}
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
