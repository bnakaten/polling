"use client";

import { useState } from "react";

interface DeletePollButtonProps {
  pollId: number;
  pollTitle: string;
}

export default function DeletePollButton({ pollId, pollTitle }: DeletePollButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    
    try {
      const response = await fetch(`/api/polls/${pollId}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        window.location.reload();
      } else {
        alert("Failed to delete poll");
      }
    } catch (error) {
      alert("Error deleting poll");
    } finally {
      setDeleting(false);
      setShowConfirm(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="flex gap-2">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Yes, Delete"}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          disabled={deleting}
          className="bg-zinc-300 text-zinc-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-zinc-400 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="bg-red-50 text-red-700 hover:bg-red-100 px-4 py-2 rounded-md text-sm font-medium transition-colors"
    >
      Delete
    </button>
  );
}
