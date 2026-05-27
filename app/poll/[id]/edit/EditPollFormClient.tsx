"use client";

import { useState, useRef, useEffect } from "react";

type AnswerType = "default" | "rating" | "textarea" | "multirangeslider";

interface Option {
  id: number;
  text: string;
}

interface Question {
  id: number;
  text: string;
  category: string;
  description: string;
  answerType: AnswerType;
  options: Option[];
  imageUrl: string;
  isOptional: boolean;
}

interface EditPollFormClientProps {
  poll: any;
  initialQuestions: any[];
  initialQuestionCount: number;
  onSubmit: (formData: FormData) => Promise<void>;
}

function generateId() {
  return Date.now() + Math.random();
}

export function EditPollFormClient({ poll, initialQuestions, initialQuestionCount, onSubmit }: EditPollFormClientProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const descriptionEditorRef = useRef<HTMLDivElement>(null);
  const descriptionValueInputRef = useRef<HTMLInputElement>(null);
  const questionDescriptionRefs = useRef<{[key: number]: HTMLDivElement}>({});
  const questionDescriptionValueInputRefs = useRef<{[key: number]: HTMLInputElement}>({});
  const [questions, setQuestions] = useState<Question[]>(initialQuestions.map((q: any) => ({
    id: q.id,
    text: q.text,
    category: q.category || "",
    description: q.description || "",
    answerType: q.answerType || "default",
    imageUrl: q.imageUrl || "",
    isOptional: q.isOptional || false,
    options: q.options.map((o: any) => ({ id: o.id, text: o.text }))
  })));
  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState(poll.imageUrl || "");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [tempImage, setTempImage] = useState<File | null>(null);
  const [questionImages, setQuestionImages] = useState<{[key: number]: File | null}>({});

  useEffect(() => {
    if (poll.description && descriptionEditorRef.current) {
      descriptionEditorRef.current.innerHTML = poll.description;
    }
    questions.forEach((q, idx) => {
      if (q.description && questionDescriptionRefs.current[idx]) {
        questionDescriptionRefs.current[idx].innerHTML = q.description;
      }
    });
  }, []);

  const addQuestion = () => {
    setQuestions([...questions, { id: generateId(), text: "", category: "", description: "", answerType: "default", options: [{ id: generateId(), text: "" }, { id: generateId(), text: "" }], imageUrl: "", isOptional: false }]);
  };

  const addOption = (questionIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options.push({ id: Date.now(), text: "" });
    setQuestions(newQuestions);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const newQuestions = [...questions];
    if (newQuestions[questionIndex].options.length > 2) {
      newQuestions[questionIndex].options.splice(optionIndex, 1);
      setQuestions(newQuestions);
    }
  };

  const removeQuestion = (questionIndex: number) => {
    const newQuestions = [...questions];
    if (newQuestions.length > 1) {
      newQuestions.splice(questionIndex, 1);
      setQuestions(newQuestions);
      
      if (formRef.current) {
        const form = formRef.current;
        const inputsToRemove = form.querySelectorAll(`[name^="question_${questionIndex}_"], [name^="answerType_radio_${questionIndex}"]`);
        inputsToRemove.forEach(input => input.remove());
      }
    }
  };

  const updateQuestionText = (questionIndex: number, text: string) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].text = text;
    setQuestions(newQuestions);
  };

  const updateQuestionCategory = (questionIndex: number, category: string) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].category = category;
    setQuestions(newQuestions);
  };

  const updateQuestionDescription = (questionIndex: number, description: string) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].description = description;
    setQuestions(newQuestions);
  };



  const handleDescriptionInput = (e: React.FormEvent<HTMLDivElement>, questionIndex: number = -1) => {
    if (questionIndex === -1) {
      if (descriptionEditorRef.current && descriptionValueInputRef.current) {
        descriptionValueInputRef.current.value = descriptionEditorRef.current.innerHTML;
      }
    } else {
      if (questionDescriptionRefs.current[questionIndex] && questionDescriptionValueInputRefs.current[questionIndex]) {
        questionDescriptionValueInputRefs.current[questionIndex].value = questionDescriptionRefs.current[questionIndex].innerHTML;
      }
    }
  };

  const updateQuestionAnswerType = (questionIndex: number, answerType: AnswerType) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].answerType = answerType;
    setQuestions(newQuestions);
  };

  const updateOptionText = (questionIndex: number, optionIndex: number, text: string) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options[optionIndex].text = text;
    setQuestions(newQuestions);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const url = URL.createObjectURL(file);
      setImageUrl(url);
    }
  };

  const handleQuestionImageChange = (questionIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setQuestionImages(prev => ({ ...prev, [questionIndex]: file }));
      setQuestions(prev => {
        const newQuestions = [...prev];
        newQuestions[questionIndex].imageUrl = "";
        return newQuestions;
      });
    }
  };

  const removeQuestionImage = (questionIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].imageUrl = "";
    setQuestions(newQuestions);
    setQuestionImages(prev => {
      const newImages = { ...prev };
      delete newImages[questionIndex];
      return newImages;
    });
  };

  const uploadImageIfNeeded = async (): Promise<string | null> => {
    if (!image || !uploadingImage) return imageUrl;

    const formData = new FormData();
    formData.append("image", image);

    try {
      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload image");
      }

      const uploadedImageUrl = data.imageUrl;
      setImageUrl(uploadedImageUrl);
      const imageUrlInput = document.getElementById("imageUrl") as HTMLInputElement;
      if (imageUrlInput) {
        imageUrlInput.value = uploadedImageUrl;
      }
      return uploadedImageUrl;
    } catch (err) {
      console.error("Failed to upload image:", err);
      return imageUrl;
    }
  };

  const uploadQuestionImages = async () => {
    const questionImageUpdates: {[key: number]: string} = {};
    
    for (const [questionIndex, file] of Object.entries(questionImages)) {
      if (file && file.size > 0) {
        const formData = new FormData();
        formData.append("image", file);
        try {
          const response = await fetch("/api/upload-image", {
            method: "POST",
            body: formData,
          });
          const data = await response.json();
          if (response.ok) {
            questionImageUpdates[parseInt(questionIndex)] = data.imageUrl;
          }
        } catch (err) {
          console.error(`Failed to upload question ${questionIndex} image:`, err);
        }
      }
    }
    
    return questionImageUpdates;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (descriptionEditorRef.current && descriptionValueInputRef.current) {
      descriptionValueInputRef.current.value = descriptionEditorRef.current.innerHTML;
    }
    questions.forEach((q, idx) => {
      if (questionDescriptionRefs.current[idx] && questionDescriptionValueInputRefs.current[idx]) {
        questionDescriptionValueInputRefs.current[idx].value = questionDescriptionRefs.current[idx].innerHTML;
      }
    });
    
    setUploadingImage(true);
    
    try {
      if (tempImage && tempImage.size > 0) {
        const uploadFormData = new FormData();
        uploadFormData.append("image", tempImage);
        try {
          const response = await fetch("/api/upload-image", {
            method: "POST",
            body: uploadFormData,
          });
          const data = await response.json();
          if (response.ok) {
            setImageUrl(data.imageUrl);
            const imageUrlInput = document.getElementById("imageUrl") as HTMLInputElement;
            if (imageUrlInput) {
              imageUrlInput.value = data.imageUrl;
            }
          }
        } catch (err) {
          console.error("Failed to upload image:", err);
        }
      }
      
      const questionImageUpdates = await uploadQuestionImages();
      
      const updatedQuestions = questions.map((q, idx) => {
        if (questionImageUpdates[idx] !== undefined) {
          return { ...q, imageUrl: questionImageUpdates[idx] };
        }
        return q;
      });
      
      setQuestions(updatedQuestions);
      
      if (formRef.current) {
        if (descriptionEditorRef.current && descriptionValueInputRef.current) {
          descriptionValueInputRef.current.value = descriptionEditorRef.current.innerHTML;
        }
        questions.forEach((q, idx) => {
          if (questionDescriptionRefs.current[idx] && questionDescriptionValueInputRefs.current[idx]) {
            questionDescriptionValueInputRefs.current[idx].value = questionDescriptionRefs.current[idx].innerHTML;
          }
        });
        const formData = new FormData(formRef.current);
        
        for (const [questionIndex, imageUrl] of Object.entries(questionImageUpdates)) {
          const inputName = `question_${questionIndex}_imageUrl`;
          formData.set(inputName, imageUrl);
        }
        
        await onSubmit(formData);
      }
    } catch (err) {
      console.error("Failed to upload images:", err);
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <form ref={formRef} onSubmit={handleFormSubmit} className="space-y-6">
      <input type="hidden" name="questionCount" value={questions.length} />
      <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-zinc-700 mb-2">Poll Title *</label>
          <input id="title" name="title" type="text" required defaultValue={poll.title} className="block w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-zinc-500 focus:border-zinc-500 sm:text-sm" placeholder="Enter poll title..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">Description (Optional)</label>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-1 p-2 bg-zinc-100 rounded-md border border-zinc-300">
          <button type="button" onClick={() => document.execCommand("bold")} className="px-2 py-1 text-sm font-bold hover:bg-zinc-200 rounded transition-colors">B</button>
          <button type="button" onClick={() => document.execCommand("italic")} className="px-2 py-1 text-sm italic hover:bg-zinc-200 rounded transition-colors">I</button>
          <button type="button" onClick={() => document.execCommand("underline")} className="px-2 py-1 text-sm underline hover:bg-zinc-200 rounded transition-colors">U</button>
        </div>
        <div
          ref={descriptionEditorRef}
           id="poll-description-editor"
           contentEditable
           suppressContentEditableWarning
           onInput={(e) => handleDescriptionInput(e, -1)}
           onKeyDown={(e) => {
             if (e.key === "Enter" && !e.shiftKey) {
               e.preventDefault();
               document.execCommand("insertHTML", false, "<br>");
             }
           }}
           className="block w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-zinc-500 focus:border-zinc-500 sm:text-sm min-h-[80px] whitespace-pre-wrap outline-none"
         />
         <p className="text-xs text-zinc-500 mt-1">Press Enter to add newlines</p>
         <input type="hidden" name="description" ref={descriptionValueInputRef} defaultValue={poll.description || ""} />
       </div>
         </div>

        <div>
          <label htmlFor="image" className="block text-sm font-medium text-zinc-700 mb-2">Poll Image (Optional)</label>
          <input
            id="image"
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setTempImage(file);
                const url = URL.createObjectURL(file);
                setImageUrl(url);
              }
            }}
            className="block w-full text-sm text-zinc-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-zinc-900 file:text-white hover:file:bg-zinc-800"
          />
          {imageUrl && !uploadingImage && (
            <div className="mt-2">
              <img
                src={imageUrl}
                alt="Preview"
                className="h-48 w-auto rounded-lg object-cover"
              />
              <div className="flex gap-2 mt-2">
                {poll.imageUrl && !imageUrl.startsWith('blob:') && (
                  <button
                    type="button"
                    onClick={() => {
                      setTempImage(null);
                      setImageUrl(poll.imageUrl);
                      const imageUrlInput = document.getElementById("imageUrl") as HTMLInputElement;
                      if (imageUrlInput) {
                        imageUrlInput.value = poll.imageUrl;
                      }
                    }}
                    className="bg-zinc-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-zinc-800 transition-colors"
                  >
                    Keep Current Image
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setTempImage(null);
                    setImageUrl("");
                    const imageUrlInput = document.getElementById("imageUrl") as HTMLInputElement;
                    if (imageUrlInput) {
                      imageUrlInput.value = "";
                    }
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-800 transition-colors"
                >
                  Remove Image
                </button>
              </div>
            </div>
          )}
          {uploadingImage && <p className="mt-2 text-sm text-zinc-600">Uploading image...</p>}
        </div>
        <input type="hidden" id="imageUrl" name="imageUrl" defaultValue={poll.imageUrl || ""} />
      </div>
      <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-zinc-900">Questions</h2>
          <button type="button" onClick={addQuestion} className="bg-zinc-900 text-white px-3 py-1 rounded-md text-sm font-medium hover:bg-zinc-800 transition-colors">Add Question</button>
        </div>
        {questions.map((question: any, questionIndex: number) => (
          <div key={question.id} className="border border-zinc-200 rounded-lg p-4 space-y-4">
            <input type="hidden" name={`question_${questionIndex}_id`} value={question.id} />
            <input type="hidden" name={`question_${questionIndex}_optionCount`} value={question.options.length} />
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-zinc-700">Question {questionIndex + 1} *</label>
               <button type="button" onClick={() => removeQuestion(questionIndex)} className="text-red-600 hover:text-red-800 text-sm font-medium" disabled={initialQuestionCount === 1}>Remove</button>
            </div>
            <input type="text" name={`question_${questionIndex}_text`} value={question.text} onChange={(e) => updateQuestionText(questionIndex, e.target.value)} className="block w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-zinc-500 focus:border-zinc-500 sm:text-sm" placeholder="Enter question text..." />
            <input type="text" name={`question_${questionIndex}_category`} value={question.category} onChange={(e) => updateQuestionCategory(questionIndex, e.target.value)} className="block w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-zinc-500 focus:border-zinc-500 sm:text-sm" placeholder="Enter question category (short sentence)..." />
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">Description (Optional)</label>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-1 p-2 bg-zinc-100 rounded-md border border-zinc-300">
                  <button type="button" onClick={() => document.execCommand("bold")} className="px-2 py-1 text-sm font-bold hover:bg-zinc-200 rounded transition-colors">B</button>
                  <button type="button" onClick={() => document.execCommand("italic")} className="px-2 py-1 text-sm italic hover:bg-zinc-200 rounded transition-colors">I</button>
                  <button type="button" onClick={() => document.execCommand("underline")} className="px-2 py-1 text-sm underline hover:bg-zinc-200 rounded transition-colors">U</button>
                </div>
                 <div
                   ref={(el) => {
                     if (el) {
                       questionDescriptionRefs.current[questionIndex] = el;
                     }
                   }}
                   id={`question-${questionIndex}-description-editor`}
                   contentEditable
                   suppressContentEditableWarning
                   onInput={(e) => handleDescriptionInput(e, questionIndex)}
                   onKeyDown={(e) => {
                     if (e.key === "Enter" && !e.shiftKey) {
                       e.preventDefault();
                       document.execCommand("insertHTML", false, "<br>");
                     }
                   }}
                   className="block w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-zinc-500 focus:border-zinc-500 sm:text-sm min-h-[80px] whitespace-pre-wrap outline-none"
                 />
                 <p className="text-xs text-zinc-500 mt-1">Press Enter to add newlines</p>
                <input type="hidden" name={`question_${questionIndex}_description`} ref={(el) => {
                  if (el) {
                    questionDescriptionValueInputRefs.current[questionIndex] = el;
                  }
                }} defaultValue={question.description || ""} />
              </div>
            </div>

            <input type="hidden" name={`answerType_${questionIndex}`} value={question.answerType} />
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">Answer Type</label>
              <div className="flex gap-2">
                <label className="flex items-center gap-1 text-sm text-zinc-700">
                  <input type="radio" name={`answerType_radio_${questionIndex}`} value="default" checked={question.answerType === "default"} onChange={(e) => updateQuestionAnswerType(questionIndex, e.target.value as AnswerType)} />
                  Default (radio buttons)
                </label>
                <label className="flex items-center gap-1 text-sm text-zinc-700">
                  <input type="radio" name={`answerType_radio_${questionIndex}`} value="rating" checked={question.answerType === "rating"} onChange={(e) => updateQuestionAnswerType(questionIndex, e.target.value as AnswerType)} />
                  Number 0-10 (slider)
                </label>
                <label className="flex items-center gap-1 text-sm text-zinc-700">
                  <input type="radio" name={`answerType_radio_${questionIndex}`} value="textarea" checked={question.answerType === "textarea"} onChange={(e) => updateQuestionAnswerType(questionIndex, e.target.value as AnswerType)} />
                  Textarea
                </label>
                <label className="flex items-center gap-1 text-sm text-zinc-700">
                  <input type="radio" name={`answerType_radio_${questionIndex}`} value="multirangeslider" checked={question.answerType === "multirangeslider"} onChange={(e) => updateQuestionAnswerType(questionIndex, e.target.value as AnswerType)} />
                  Multi-Range Slider
                </label>
                <label className="flex items-center gap-1 text-sm text-zinc-700 ml-4">
                  <input
                    type="checkbox"
                    name={`question_${questionIndex}_isOptional`}
                    value="true"
                    checked={question.isOptional}
                    onChange={(e) => setQuestions(prev => {
                      const newQuestions = [...prev];
                      newQuestions[questionIndex].isOptional = e.target.checked;
                      return newQuestions;
                    })}
                  />
                  Optional
                </label>
              </div>
            </div>

            <div>
              <label htmlFor={`question_${questionIndex}_image`} className="block text-sm font-medium text-zinc-700 mb-2">Question Image (Optional)</label>
              <input
                id={`question_${questionIndex}_image`}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="block w-full text-sm text-zinc-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-zinc-900 file:text-white hover:file:bg-zinc-800"
                onChange={(e) => handleQuestionImageChange(questionIndex, e)}
              />
              {question.imageUrl && (
                <div className="mt-2">
                  <img
                    src={question.imageUrl}
                    alt="Question preview"
                    className="h-32 w-auto rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeQuestionImage(questionIndex)}
                    className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-800 transition-colors mt-2"
                  >
                    Remove Image
                  </button>
                </div>
              )}
            </div>
            <input type="hidden" name={`question_${questionIndex}_imageUrl`} value={question.imageUrl || ""} />

            {question.answerType === "default" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">Options *</label>
                {question.options.map((option: any, optionIndex: number) => (
                  <div key={option.id} className="flex gap-2">
                    <input type="text" name={`question_${questionIndex}_option_${optionIndex}_text`} value={option.text} onChange={(e) => updateOptionText(questionIndex, optionIndex, e.target.value)} className="block w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-zinc-500 focus:border-zinc-500 sm:text-sm" placeholder={`Option ${optionIndex + 1}`} />
                    <input type="hidden" name={`question_${questionIndex}_option_${optionIndex}_id`} value={option.id} />
                    <button type="button" onClick={() => removeOption(questionIndex, optionIndex)} className="bg-red-50 text-red-600 px-3 py-2 rounded-md hover:bg-red-100 transition-colors" disabled={question.options.length === 1}>×</button>
                  </div>
                ))}
                <button type="button" onClick={() => addOption(questionIndex)} className="text-zinc-600 hover:text-zinc-900 text-sm font-medium">+ Add Option</button>
              </div>
            )}

            {question.answerType === "multirangeslider" && (
              <div className="space-y-6 p-4 bg-zinc-50 rounded-lg border border-zinc-200">
                <div>
                  <label className="text-sm font-medium text-zinc-700 mb-3 block">Likelihood</label>
                  <div className="space-y-2">
                    <input
                      type="range"
                      name={`question_${questionIndex}_likelihood`}
                      min="0"
                      max="5"
                      defaultValue={((): string => {
                        const val = String(question.options[0]?.text || "0");
                        const parts = val.split(",");
                        const first = parts[0] ? parts[0] : "0";
                        return first === "3" ? "0" : first;
                      })()}
                      className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-zinc-500">
                      <span>0 No vote</span>
                      <span>1 Not likely</span>
                      <span>2 Low likely</span>
                      <span>3 Likely</span>
                      <span>4 Highly likely</span>
                      <span>5 Near certainty</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-700 mb-3 block">Consequences</label>
                  <div className="space-y-2">
                    <input
                      type="range"
                      name={`question_${questionIndex}_consequences`}
                      min="0"
                      max="5"
                      defaultValue={((): string => {
                        const val = String(question.options[0]?.text || "0,0");
                        const parts = val.split(",");
                        const second = parts[1] ? parts[1] : "0";
                        return second === "3" ? "0" : second;
                      })()}
                      className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-zinc-500">
                      <span>0 No vote</span>
                      <span>1 Minimal</span>
                      <span>2 Minor</span>
                      <span>3 Medium</span>
                      <span>4 Major</span>
                      <span>5 Critical</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <a href={`/poll/${poll.id}`} className="fixed bottom-6 left-6 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 px-6 py-3 rounded-full shadow-lg transition-all hover:scale-105 flex items-center gap-2 z-50">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
        Cancel
      </a>
      <button type="submit" className="fixed bottom-6 right-6 bg-zinc-900 hover:bg-zinc-800 text-white px-6 py-3 rounded-full shadow-lg transition-all hover:scale-105 flex items-center gap-2 z-50">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
        </svg>
        Update Poll
      </button>
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="fixed top-6 right-6 bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-3 rounded-full shadow-lg transition-all hover:scale-105 flex items-center gap-2 z-50"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      </button>
    </form>
  );
}
