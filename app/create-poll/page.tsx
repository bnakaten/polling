"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type AnswerType = "default" | "rating" | "textarea" | "multirangeslider";

interface CsvQuestion {
  question: string;
  answer_type: string;
  options: string[];
}

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

export default function CreatePollPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [questions, setQuestions] = useState<Question[]>([
    { id: 1, text: "", category: "", description: "", answerType: "default", options: [{ id: 1, text: "" }, { id: 2, text: "" }], imageUrl: "", isOptional: false },
  ]);
  const [questionImages, setQuestionImages] = useState<{ [key: number]: string | File }>({});
  const [sliderValues, setSliderValues] = useState<{ [key: number]: { likelihood: string; consequences: string } }>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [votingLink, setVotingLink] = useState<string | null>(null);
  const [generatedUrls, setGeneratedUrls] = useState<string[]>([]);
  const [urlCount, setUrlCount] = useState(10);
  const [maxVotes, setMaxVotes] = useState(1);
  const [useCsvImport, setUseCsvImport] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string>("");
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvSuccess, setCsvSuccess] = useState<boolean>(false);
  const router = useRouter();
  const descriptionEditorRef = useRef<HTMLDivElement>(null);
  const questionDescriptionRefs = useRef<{[key: number]: HTMLDivElement}>({});

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: Date.now(),
        text: "",
        category: "",
        description: "",
        answerType: "default",
        options: [{ id: Date.now(), text: "" }, { id: Date.now(), text: "" }],
        imageUrl: "",
        isOptional: false,
      },
    ]);
    setSliderValues(prev => ({
      ...prev,
      [questions.length]: { likelihood: "3", consequences: "3" }
    }));
  };

  const handleDescriptionInput = (e: React.FormEvent<HTMLDivElement>, questionIndex: number = -1) => {
    const content = e.currentTarget.innerHTML;
    
    if (questionIndex === -1) {
      if (questions.length > 0) {
        const newQuestions = [...questions];
        newQuestions[0].description = content;
        setQuestions(newQuestions);
      }
    } else {
      const newQuestions = [...questions];
      newQuestions[questionIndex].description = content;
      setQuestions(newQuestions);
    }
  };

  const updateQuestionAnswerType = (questionIndex: number, answerType: AnswerType) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].answerType = answerType;
    
    if (answerType === "multirangeslider") {
      setSliderValues(prev => ({
        ...prev,
        [questionIndex]: prev[questionIndex] || { likelihood: "3", consequences: "3" }
      }));
    }
    
    setQuestions(newQuestions);
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

  const updateQuestionOptional = (questionIndex: number, isOptional: boolean) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].isOptional = isOptional;
    setQuestions(newQuestions);
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

  const updateOptionText = (questionIndex: number, optionIndex: number, text: string) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options[optionIndex].text = text;
    setQuestions(newQuestions);
  };

  const updateSliderValue = (questionIndex: number, type: "likelihood" | "consequences", value: string) => {
    setSliderValues(prev => ({
      ...prev,
      [questionIndex]: {
        ...prev[questionIndex],
        [type]: value
      }
    }));
  };

  const handleQuestionImageChange = (questionIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setQuestionImages((prev) => ({ ...prev, [questionIndex]: file }));
      setQuestions((prev) => {
        const newQuestions = [...prev];
        newQuestions[questionIndex].imageUrl = "";
        return newQuestions;
      });
    }
  };

  const removeQuestion = (questionIndex: number) => {
    setQuestions((prev) => prev.filter((_, idx) => idx !== questionIndex));
  };

  const removeQuestionImage = (questionIndex: number) => {
    setQuestionImages((prev) => {
      const updated = { ...prev };
      delete updated[questionIndex];
      return updated;
    });
    setQuestions((prev) => {
      const newQuestions = [...prev];
      newQuestions[questionIndex].imageUrl = "";
      return newQuestions;
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
    }
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      setCsvError(null);
      setCsvSuccess(false);
    }
  };

  const handleCsvInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCsvContent(e.target.value);
    setCsvError(null);
    setCsvSuccess(false);
  };

  const handleUploadImage = async () => {
    if (!image) return;

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

      setImageUrl(data.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
    }
  };

  const uploadQuestionImages = async (questions: Question[]) => {
    const questionImagePromises = Object.entries(questionImages).map(async ([index, file]) => {
      if (file && file instanceof File && file.size > 0) {
        const formData = new FormData();
        formData.append("image", file);
        try {
          const response = await fetch("/api/upload-image", {
            method: "POST",
            body: formData,
          });
          const data = await response.json();
          if (response.ok) {
            return { index: parseInt(index), imageUrl: data.imageUrl };
          }
        } catch (err) {
          console.error(`Failed to upload question image ${index}:`, err);
        }
      }
      return null;
    });

    const results = await Promise.all(questionImagePromises);
    return results.filter((result): result is NonNullable<typeof result> => result !== null);
  };

  const handleCsvSubmit = async () => {
    if (!csvFile) {
      setCsvError("Please select a CSV file");
      return;
    }

    setError(null);
    setCsvError(null);
    setLoading(true);
    setVotingLink(null);

    const formData = new FormData();
    formData.append("csvFile", csvFile);

    try {
      const response = await fetch("/api/polls/import", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to import CSV poll");
      }

      setVotingLink(data.votingLink);
      setCsvSuccess(true);
    } catch (err) {
      setCsvError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setVotingLink(null);

    if (descriptionEditorRef.current) {
      if (questions.length > 0) {
        const newQuestions = [...questions];
        newQuestions[0].description = descriptionEditorRef.current.innerHTML;
        setQuestions(newQuestions);
      }
    }
    for (const [questionIndex, questionRef] of Object.entries(questionDescriptionRefs.current)) {
      const newQuestions = [...questions];
      newQuestions[Number(questionIndex)].description = questionRef.innerHTML;
      setQuestions(newQuestions);
    }

    const validQuestions = questions.filter((q) => q.text.trim());

    if (validQuestions.length === 0) {
      setError("Please add at least one question");
      setLoading(false);
      return;
    }

    let finalImageUrl = imageUrl;

    if (image && !imageUrl.startsWith('/poll-images/')) {
      const formData = new FormData();
      formData.append("image", image);
      try {
        const uploadResponse = await fetch("/api/upload-image", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadResponse.json();
        if (uploadResponse.ok) {
          finalImageUrl = uploadData.imageUrl;
        }
      } catch (err) {
        console.error("Failed to upload image:", err);
      }
    }

    const uploadedQuestionImages = await uploadQuestionImages(questions);

    const formattedQuestions = validQuestions.map((q) => {
      const uploadedImage = uploadedQuestionImages.find((ui) => ui.index === questions.indexOf(q));
      if (q.answerType === "multirangeslider") {
        return {
          text: q.text,
          category: q.category,
          description: q.description,
          answerType: q.answerType,
          imageUrl: uploadedImage ? uploadedImage.imageUrl : "",
          isOptional: q.isOptional,
          likelihood: sliderValues[questions.indexOf(q)]?.likelihood || "3",
          consequences: sliderValues[questions.indexOf(q)]?.consequences || "3",
        };
      }
      return {
        text: q.text,
        category: q.category,
        description: q.description,
        answerType: q.answerType,
        options: q.options.filter((o) => o.text.trim()).map((o) => o.text),
        imageUrl: uploadedImage ? uploadedImage.imageUrl : "",
        isOptional: q.isOptional,
      };
    });

    try {
      const response = await fetch("/api/polls", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          imageUrl: finalImageUrl,
          url,
          questions: formattedQuestions,
          urlCount,
          maxVotes,
        }),
      });

       const data = await response.json();

       if (!response.ok) {
         throw new Error(data.error || "Failed to create poll");
       }

        setVotingLink(data.votingLink);
        setGeneratedUrls(data.generatedUrls || []);
     } catch (err) {
       setError(err instanceof Error ? err.message : "An error occurred");
     } finally {
       setLoading(false);
     }
   };

   const downloadCSV = () => {
     if (generatedUrls.length === 0) return;
     
     const csvContent = "data:text/csv;charset=utf-8," + generatedUrls.join("\n");
     const encodedUri = encodeURI(csvContent);
     const link = document.createElement("a");
     link.setAttribute("href", encodedUri);
     link.setAttribute("download", `poll_${new Date().getTime()}_urls.csv`);
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
   };

  const resetForm = () => {
    setVotingLink(null);
    setGeneratedUrls([]);
    setTitle("");
    setDescription("");
    setImage(null);
    setImageUrl("");
    setQuestions([{ id: 1, text: "", category: "", description: "", answerType: "default", options: [{ id: 1, text: "" }, { id: 2, text: "" }], imageUrl: "", isOptional: false }]);
    setQuestionImages({});
    setSliderValues({});
  };

   return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="bg-zinc-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <a href="/dashboard" className="text-xl font-bold">Polling Admin</a>
              <div className="flex space-x-4">
                <a href="/dashboard" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                  Dashboard
                </a>
                <a href="/create-poll" className="text-white px-3 py-2 rounded-md text-sm font-medium">
                  Create Poll
                </a>
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
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-zinc-900">Create New Poll</h1>
          <button
            type="button"
            onClick={() => setUseCsvImport(!useCsvImport)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              useCsvImport
                ? "bg-zinc-900 text-white"
                : "bg-zinc-200 text-zinc-900 hover:bg-zinc-300"
            }`}
          >
            {useCsvImport ? "Switch to Manual Entry" : "Import from CSV"}
          </button>
        </div>

        {votingLink ? (
          <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-2xl font-bold text-green-600 mb-4">Poll Created Successfully!</h2>
            <p className="text-zinc-600 mb-6">Share this voting link with your respondents:</p>
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 mb-6">
              <a href={votingLink} target="_blank" className="text-blue-600 hover:underline break-all">
                {votingLink}
              </a>
            </div>
            {generatedUrls.length > 0 && (
              <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-zinc-600 mb-4">{generatedUrls.length} URLs generated:</p>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {generatedUrls.map((url, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <a href={url} target="_blank" className="text-blue-600 hover:underline break-all">
                        {url}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={downloadCSV}
                className="flex-1 bg-zinc-100 text-zinc-900 px-6 py-3 rounded-md text-sm font-medium hover:bg-zinc-200 transition-colors"
              >
                Download URLs CSV
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 bg-zinc-900 text-white px-6 py-3 rounded-md text-sm font-medium hover:bg-zinc-800 transition-colors"
              >
                Create Another Poll
              </button>
              <a
                href="/dashboard"
                className="flex-1 bg-zinc-100 text-zinc-900 px-6 py-3 rounded-md text-sm font-medium hover:bg-zinc-200 transition-colors text-center"
              >
                Back to Dashboard
              </a>
            </div>
          </div>
        ) : useCsvImport ? (
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold text-zinc-900">CSV Import</h2>
              
              {csvSuccess && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  Poll imported successfully! Check the success message for voting link.
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-700">
                  CSV File *
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvFileChange}
                  className="block w-full text-sm text-zinc-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-zinc-900 file:text-white hover:file:bg-zinc-800"
                />
                {csvFile && (
                  <p className="text-xs text-zinc-500">Selected: {csvFile.name}</p>
                )}
              </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-700">
                    CSV Format
                  </label>
                  <div className="bg-zinc-100 rounded-lg p-4 text-sm text-zinc-700">
                     <p className="font-medium mb-2">Required columns:</p>
                     <ul className="list-disc list-inside space-y-1">
                       <li><code className="bg-zinc-200 px-1 rounded">category</code> - Question category (short sentence)</li>
                       <li><code className="bg-zinc-200 px-1 rounded">question</code> - Question text</li>
                       <li><code className="bg-zinc-200 px-1 rounded">description</code> - Question long description</li>
                     </ul>
                     <p className="font-medium mt-3 mb-2">Optional columns:</p>
                     <ul className="list-disc list-inside space-y-1">
                       <li><code className="bg-zinc-200 px-1 rounded">answer_type</code> - Question type (default/rating/textarea/multirangeslider)</li>
                       <li><code className="bg-zinc-200 px-1 rounded">option1</code>, <code className="bg-zinc-200 px-1 rounded">option2</code>, etc. - Answer options</li>
                       <li><code className="bg-zinc-200 px-1 rounded">likelihood</code>, <code className="bg-zinc-200 px-1 rounded">consequences</code> - Slider values for multirangeslider (1-5)</li>
                     </ul>
                    <p className="font-medium mt-3 mb-2">Poll metadata (at top of file with # prefix):</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li><code className="bg-zinc-200 px-1 rounded"># title:</code> - Poll title</li>
                      <li><code className="bg-zinc-200 px-1 rounded"># url:</code> - Unique URL slug</li>
                      <li><code className="bg-zinc-200 px-1 rounded"># description:</code> - Poll description</li>
                      <li><code className="bg-zinc-200 px-1 rounded"># number of voting urls:</code> - Number of voting links to generate</li>
                      <li><code className="bg-zinc-200 px-1 rounded"># max votes per url:</code> - Maximum votes per voting link</li>
                    </ul>
                    <p className="text-xs text-zinc-500 mt-2">Note: Poll metadata appears once at the top. Each data row represents one question.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-700">
                    Example CSV
                  </label>
                  <textarea
                    readOnly
                     value={`# title: "My Poll Title"
  # url: "mypoll"
  # description: "My description"
  # number of voting urls: 5
  # max votes per url: 10
"category","question","description","answer_type","option1","option2","option3","option4","likelihood","consequences"
"","How satisfied are you?","Please let us know","default","Satisfied","Neutral","Dissatisfied","","",""
"","What is your favorite color?","","default","Red","Blue","Green","","",""
"","Rate this service","Rate from 0-10","rating","","","","","","",""
"","Open feedback","Any additional comments","textarea","","","","","","",""
"","Impact assessment","Rate impact and consequences","multirangeslider","","","","","3","4"`}
                    className="block w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-zinc-500 focus:border-zinc-500 sm:text-sm font-mono text-xs"
                    rows={10}
                  />
                </div>

              {csvError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {csvError}
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={handleCsvSubmit}
                  disabled={loading || !csvFile}
                  className="flex-1 bg-zinc-900 text-white px-6 py-3 rounded-md text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Importing..." : "Import CSV Poll"}
                </button>
                <a
                  href="/dashboard"
                  className="flex-1 bg-zinc-100 text-zinc-900 px-6 py-3 rounded-md text-sm font-medium hover:bg-zinc-200 transition-colors text-center"
                >
                  Cancel
                </a>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

          <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-zinc-700 mb-2">
                Poll Title *
              </label>
              <input
                id="title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="block w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-zinc-500 focus:border-zinc-500 sm:text-sm"
                placeholder="Enter poll title..."
              />
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
                    }
                  }}
                  className="block w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-zinc-500 focus:border-zinc-500 sm:text-sm min-h-[80px] whitespace-pre-wrap outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="image" className="block text-sm font-medium text-zinc-700 mb-2">
                Poll Image (Optional)
              </label>
              <input
                id="image"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleImageChange}
                className="block w-full text-sm text-zinc-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-zinc-900 file:text-white hover:file:bg-zinc-800"
              />
              {imageUrl && (
                <div className="mt-2">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="h-48 w-auto rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleUploadImage}
                    className="mt-2 bg-zinc-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-zinc-800 transition-colors"
                  >
                    Upload Image
                  </button>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="url" className="block text-sm font-medium text-zinc-700 mb-2">
                Poll URL *
              </label>
              <input
                id="url"
                type="text"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="block w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-zinc-500 focus:border-zinc-500 sm:text-sm"
                placeholder="my-poll"
              />
              <p className="text-xs text-zinc-500 mt-1">Enter a unique URL slug for your poll</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-zinc-900">Questions</h2>
              <button
                type="button"
                onClick={addQuestion}
                className="bg-zinc-900 text-white px-3 py-1 rounded-md text-sm font-medium hover:bg-zinc-800 transition-colors"
              >
                Add Question
              </button>
            </div>

            {questions.map((question, questionIndex) => (
              <div key={question.id} className="border border-zinc-200 rounded-lg p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg md:text-xl font-semibold text-zinc-900">
                    Question {questionIndex + 1}
                    {question.category && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-600">
                        {question.category}
                      </span>
                    )}
                  </h3>
                  <button
                    type="button"
                    onClick={() => removeQuestion(questionIndex)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                    disabled={questions.length === 1}
                  >
                    Remove
                  </button>
                </div>
                <input
                  type="text"
                  value={question.text}
                  onChange={(e) => updateQuestionText(questionIndex, e.target.value)}
                  className="block w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-zinc-500 focus:border-zinc-500 sm:text-sm"
                  placeholder="Enter question text..."
                />
                <input
                  type="text"
                  value={question.category}
                  onChange={(e) => updateQuestionCategory(questionIndex, e.target.value)}
                  className="block w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-zinc-500 focus:border-zinc-500 sm:text-sm"
                  placeholder="Enter question category (short sentence)..."
                />
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
                        }
                      }}
                      className="block w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-zinc-500 focus:border-zinc-500 sm:text-sm min-h-[80px] whitespace-pre-wrap outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700">Answer Type</label>
                  <div className="flex gap-2">
                    <label className="flex items-center gap-1 text-sm text-zinc-700">
                      <input
                        type="radio"
                        name={`answerType_${questionIndex}`}
                        value="default"
                        checked={question.answerType === "default"}
                        onChange={(e) => updateQuestionAnswerType(questionIndex, e.target.value as AnswerType)}
                      />
                      Default (radio buttons)
                    </label>
                    <label className="flex items-center gap-1 text-sm text-zinc-700">
                      <input
                        type="radio"
                        name={`answerType_${questionIndex}`}
                        value="rating"
                        checked={question.answerType === "rating"}
                        onChange={(e) => updateQuestionAnswerType(questionIndex, e.target.value as AnswerType)}
                      />
                      Number 0-10 (slider)
                    </label>
                    <label className="flex items-center gap-1 text-sm text-zinc-700">
                      <input
                        type="radio"
                        name={`answerType_${questionIndex}`}
                        value="textarea"
                        checked={question.answerType === "textarea"}
                        onChange={(e) => updateQuestionAnswerType(questionIndex, e.target.value as AnswerType)}
                      />
                      Textarea
                    </label>
                    <label className="flex items-center gap-1 text-sm text-zinc-700">
                      <input
                        type="radio"
                        name={`answerType_${questionIndex}`}
                        value="multirangeslider"
                        checked={question.answerType === "multirangeslider"}
                        onChange={(e) => updateQuestionAnswerType(questionIndex, e.target.value as AnswerType)}
                      />
                      Multi-Range Slider
                    </label>
                    {question.answerType === "textarea" && (
                      <label className="flex items-center gap-1 text-sm text-zinc-700 ml-4">
                        <input
                          type="checkbox"
                          checked={question.isOptional}
                          onChange={(e) => updateQuestionOptional(questionIndex, e.target.checked)}
                        />
                        Optional
                      </label>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700">Question Image (Optional)</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={(e) => handleQuestionImageChange(questionIndex, e)}
                    className="block w-full text-sm text-zinc-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-zinc-900 file:text-white hover:file:bg-zinc-800"
                  />
                  {question.imageUrl && (
                    <div className="flex items-center gap-2">
                      <img
                        src={question.imageUrl}
                        alt="Question preview"
                        className="h-24 w-auto rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeQuestionImage(questionIndex)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                {question.answerType === "default" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700">Options *</label>
                    {question.options.map((option, optionIndex) => (
                      <div key={option.id} className="flex gap-2">
                        <input
                          type="text"
                          value={option.text}
                          onChange={(e) => updateOptionText(questionIndex, optionIndex, e.target.value)}
                          className="block w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-zinc-500 focus:border-zinc-500 sm:text-sm"
                          placeholder={`Option ${optionIndex + 1}`}
                        />
                        <button
                          type="button"
                          onClick={() => removeOption(questionIndex, optionIndex)}
                          className="bg-red-50 text-red-600 px-3 py-2 rounded-md hover:bg-red-100 transition-colors"
                          disabled={question.options.length === 1}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addOption(questionIndex)}
                      className="text-zinc-600 hover:text-zinc-900 text-sm font-medium"
                    >
                      + Add Option
                    </button>
                  </div>
                )}

                {question.answerType === "multirangeslider" && (
                  <div className="space-y-6 p-4 bg-zinc-50 rounded-lg border border-zinc-200">
                    <div>
                      <label className="text-sm font-medium text-zinc-700 mb-3 block">Likelihood</label>
                      <div className="space-y-2">
                        <input
                          type="range"
                          min="1"
                          max="5"
                          value={sliderValues[questionIndex]?.likelihood || "3"}
                          onChange={(e) => updateSliderValue(questionIndex, "likelihood", e.target.value)}
                          className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-zinc-500">
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
                          min="1"
                          max="5"
                          value={sliderValues[questionIndex]?.consequences || "3"}
                          onChange={(e) => updateSliderValue(questionIndex, "consequences", e.target.value)}
                          className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-zinc-500">
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

          <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Number of voting URLs to generate: <span className="font-bold text-zinc-900">{urlCount}</span>
              </label>
              <input
                type="range"
                min="1"
                max="100"
                value={urlCount}
                onChange={(e) => setUrlCount(parseInt(e.target.value))}
                className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-zinc-500 mt-2">
                <span>1</span>
                <span>50</span>
                <span>100</span>
              </div>
              <p className="text-xs text-zinc-500 mt-2">These URLs will be generated automatically when creating the poll.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Max votes per URL: <span className="font-bold text-zinc-900">{maxVotes}</span>
              </label>
              <input
                type="range"
                min="1"
                max="40"
                value={maxVotes}
                onChange={(e) => setMaxVotes(parseInt(e.target.value))}
                className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-zinc-500 mt-2">
                <span>1</span>
                <span>20</span>
                <span>40</span>
              </div>
              <p className="text-xs text-zinc-500 mt-2">Each voting URL can be used this many times for successful poll submissions.</p>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-zinc-900 text-white px-6 py-3 rounded-md text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating Poll..." : "Create Poll"}
            </button>
            <a
              href="/dashboard"
              className="flex-1 bg-zinc-100 text-zinc-900 px-6 py-3 rounded-md text-sm font-medium hover:bg-zinc-200 transition-colors text-center"
            >
              Cancel
            </a>
          </div>
          </form>
          )}
      </main>
    </div>
  );
}
