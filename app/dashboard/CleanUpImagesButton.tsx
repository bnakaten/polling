"use client";

import { useState } from "react";

interface CleanUpImagesButtonProps {
  pollCount: number;
}

export default function CleanUpImagesButton({ pollCount }: CleanUpImagesButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleCleanUp = async () => {
    setCleaning(true);
    setResult(null);
    
    try {
      const response = await fetch("/api/clean-up-images", {
        method: "POST",
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResult({ success: true, message: data.message || `Removed ${data.removedCount || 0} unused image files` });
        setShowConfirm(false);
      } else {
        setResult({ success: false, message: data.error || "Failed to clean up images" });
      }
    } catch (error) {
      setResult({ success: false, message: "Error cleaning up images" });
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
          className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {cleaning ? "Cleaning..." : "Yes, Clean Up"}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          disabled={cleaning}
          className="bg-zinc-300 text-zinc-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-zinc-400 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => setShowConfirm(true)}
        disabled={cleaning || pollCount === 0}
        className="bg-zinc-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Clean Up Images
      </button>
      {result && (
        <span className={`text-sm ${result.success ? "text-green-600" : "text-red-600"}`}>
          {result.message}
        </span>
      )}
    </div>
  );
}
