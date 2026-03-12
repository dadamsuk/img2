"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface LeaderboardEntry {
  userId: string;
  displayName: string;
  totalScore: number;
  settingScore: number;
  guessingScore: number;
}

export default function LeaderboardPage() {
  const { id: groupId } = useParams<{ id: string }>();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/groups/${groupId}/leaderboard`)
      .then((r) => r.json())
      .then(setEntries)
      .finally(() => setLoading(false));
  }, [groupId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4">
      <Link
        href={`/groups/${groupId}`}
        className="text-sm text-muted hover:text-foreground mb-4 inline-block"
      >
        &larr; Back to group
      </Link>

      <h1 className="text-2xl font-bold mb-6">Leaderboard</h1>

      {entries.length === 0 ? (
        <p className="text-muted text-center py-8">No scores yet</p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, i) => (
            <div
              key={entry.userId}
              className="rounded-lg bg-surface border border-border p-4"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`text-2xl font-bold ${
                    i === 0
                      ? "text-accent"
                      : i === 1
                      ? "text-gray-400"
                      : i === 2
                      ? "text-amber-700"
                      : "text-muted"
                  }`}
                >
                  #{i + 1}
                </span>
                <div className="flex-1">
                  <p className="font-semibold">{entry.displayName}</p>
                  <div className="flex gap-4 text-xs text-muted mt-1">
                    <span>Setting: {entry.settingScore.toFixed(1)}</span>
                    <span>Guessing: {entry.guessingScore.toFixed(1)}</span>
                  </div>
                </div>
                <span className="text-xl font-bold text-accent">
                  {entry.totalScore.toFixed(1)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
