"use client";

import { useState } from "react";

export default function GenerateTokenForm({ pollId }: { pollId: number }) {
  const [votingLink, setVotingLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [maxVotes, setMaxVotes] = useState(1);

  const generateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`/api/polls/${pollId}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxVotes }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate voting link");
      }

      setVotingLink(data.votingLink);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (votingLink) {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-medium text-green-800 mb-2">New voting link generated:</p>
          <div className="flex gap-2">
            <a href={votingLink} target="_blank" className="flex-1 text-blue-600 hover:underline break-all text-sm">
              {votingLink}
            </a>
            <button
              type="button"
              onClick={() => setVotingLink(null)}
              className="bg-green-700 text-white px-3 py-1 rounded-md text-xs font-medium hover:bg-green-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={generateToken} className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <label className="text-sm text-zinc-600">Max votes:</label>
        <input
          type="number"
          min="1"
          value={maxVotes}
          onChange={(e) => setMaxVotes(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-16 px-2 py-1 border border-zinc-300 rounded text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="bg-zinc-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Generating..." : "Generate New Link"}
      </button>
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </form>
  );
}
