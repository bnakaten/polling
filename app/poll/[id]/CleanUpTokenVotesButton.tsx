"use client";

import { useState } from "react";

interface CleanUpTokenVotesButtonProps {
  pollId: number;
  token: string;
  onCleaned: () => void;
}

export default function CleanUpTokenVotesButton({ pollId, token, onCleaned }: CleanUpTokenVotesButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleCleanUp = async () => {
    setCleaning(true);
    setResult(null);
    
    try {
      const response = await fetch(`/api/polls/${pollId}/clean-up-token-votes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ token }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResult({ success: true, message: data.message || "Votes for this token have been removed" });
        setShowConfirm(false);
        setTimeout(() => {
          setResult(null);
          onCleaned();
        }, 1500);
      } else {
        setResult({ success: false, message: data.error || "Failed to clean up votes" });
      }
    } catch (error) {
      setResult({ success: false, message: "Error cleaning up votes" });
    } finally {
      setCleaning(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="flex gap-2">
        <button
          onClick={handleCleanUp}
          disabled={cleaning}
          className="bg-red-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {cleaning ? "Cleaning..." : "Yes"}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          disabled={cleaning}
          className="bg-zinc-300 text-zinc-700 px-3 py-1 rounded text-xs font-medium hover:bg-zinc-400 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setShowConfirm(true)}
        disabled={cleaning}
        title="Remove all votes for this token"
        className="text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
      {result && (
        <span className={`text-xs ${result.success ? "text-green-600" : "text-red-600"}`}>
          {result.message}
        </span>
      )}
    </div>
  );
}
