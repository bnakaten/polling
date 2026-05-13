"use client";

import { useState } from "react";

interface GenerateUrlsFormProps {
  pollId: number;
  onCancel: () => void;
  onUrlsGenerated: () => void;
}

export default function GenerateUrlsForm({ pollId, onCancel, onUrlsGenerated }: GenerateUrlsFormProps) {
  const [count, setCount] = useState(10);
  const [maxVotes, setMaxVotes] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [generatedUrls, setGeneratedUrls] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);

    try {
      const response = await fetch("/api/polls/generate-tokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pollId,
          count,
          maxVotes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate tokens");
      }

      setGeneratedUrls(data.urls || []);
      onUrlsGenerated();
    } catch (err) {
      alert(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setGenerating(false);
    }
  };

  const downloadCSV = () => {
    if (generatedUrls.length === 0) return;

    const csvContent = "data:text/csv;charset=utf-8," + generatedUrls.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `poll_${pollId}_urls.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold text-zinc-900 mb-4">Generate Voting URLs</h2>
      
      {generatedUrls.length === 0 ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Number of URLs to generate: <span className="font-bold text-zinc-900">{count}</span>
            </label>
            <input
              type="range"
              min="1"
              max="100"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value))}
              className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-zinc-500 mt-2">
              <span>1</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Votes per URL: <span className="font-bold text-zinc-900">{maxVotes}</span>
            </label>
            <input
              type="number"
              min="1"
              value={maxVotes}
              onChange={(e) => setMaxVotes(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={generating}
              className="flex-1 bg-zinc-900 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              {generating ? "Generating..." : "Generate URLs"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-zinc-100 text-zinc-900 px-6 py-2 rounded-md text-sm font-medium hover:bg-zinc-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <p className="text-green-600 font-medium">{generatedUrls.length} URLs generated successfully!</p>
          
          <div className="max-h-48 overflow-y-auto bg-zinc-50 border border-zinc-200 rounded-lg p-4">
            {generatedUrls.slice(0, 10).map((url, index) => (
              <p key={index} className="text-sm break-all text-zinc-700">{url}</p>
            ))}
            {generatedUrls.length > 10 && (
              <p className="text-xs text-zinc-500 mt-2">... and {generatedUrls.length - 10} more</p>
            )}
          </div>

          <div className="flex gap-4">
            <button
              onClick={downloadCSV}
              className="flex-1 bg-zinc-900 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-zinc-800 transition-colors"
            >
              Download CSV
            </button>
            <button
              onClick={onCancel}
              className="flex-1 bg-zinc-100 text-zinc-900 px-6 py-2 rounded-md text-sm font-medium hover:bg-zinc-200 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
