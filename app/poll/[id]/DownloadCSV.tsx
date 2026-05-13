"use client";

import { useState } from "react";

interface DownloadCSVProps {
  pollId: number;
  pollTitle: string;
  includeTokens?: boolean;
}

export default function DownloadCSV({ pollId, pollTitle, includeTokens = false }: DownloadCSVProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    
    try {
      const url = includeTokens 
        ? `/api/polls/${pollId}/export?includeTokens=true`
        : `/api/polls/${pollId}/export`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        const link = document.createElement("a");
        link.href = data.csvData;
        link.download = data.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error("Failed to download CSV:", error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="bg-zinc-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {downloading ? "Downloading..." : "Download CSV"}
    </button>
  );
}
