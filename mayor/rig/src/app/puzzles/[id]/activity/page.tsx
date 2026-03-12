"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface GuesserActivity {
  guesserId: string;
  guesserName: string;
  status: string;
  revealsUsed: number;
  score: number;
  setterScore: number;
  guesses: Array<{
    field: string;
    value: string;
    isCorrect: boolean;
    pointsAwarded: number;
  }>;
}

interface PuzzleActivity {
  puzzleId: string;
  turnDate: string;
  totalPoints: number;
  guessers: GuesserActivity[];
}

export default function ActivityPage() {
  const { id: puzzleId } = useParams<{ id: string }>();
  const [activity, setActivity] = useState<PuzzleActivity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We need to find the group for this puzzle; for now poll the activity endpoint
    // This is a simplified approach — get all activities and filter
    async function load() {
      try {
        const res = await fetch(`/api/puzzles/${puzzleId}/activity`);
        if (res.ok) {
          setActivity(await res.json());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [puzzleId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4">
      <Link href="/" className="text-sm text-muted hover:text-foreground mb-4 inline-block">
        &larr; Back
      </Link>

      <h1 className="text-2xl font-bold mb-6">Puzzle Activity</h1>

      {!activity || activity.guessers.length === 0 ? (
        <div className="text-center py-12 text-muted">
          <p className="text-lg mb-2">No guessers yet</p>
          <p className="text-sm">Waiting for group members to start guessing...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg bg-surface border border-border p-4">
            <p className="text-sm text-muted">Total Points: {activity.totalPoints}</p>
          </div>

          {activity.guessers.map((guesser) => (
            <div
              key={guesser.guesserId}
              className="rounded-lg bg-surface border border-border p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{guesser.guesserName}</h3>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    guesser.status === "completed"
                      ? "bg-success/20 text-success"
                      : guesser.status === "conceded"
                      ? "bg-error/20 text-error"
                      : "bg-accent/20 text-accent"
                  }`}
                >
                  {guesser.status}
                </span>
              </div>

              <div className="flex gap-4 text-sm text-muted mb-3">
                <span>Reveals: {guesser.revealsUsed}</span>
                <span>Score: {guesser.score.toFixed(1)}</span>
                {guesser.setterScore > 0 && (
                  <span>Your pts: {guesser.setterScore.toFixed(1)}</span>
                )}
              </div>

              {guesser.guesses.length > 0 && (
                <div className="space-y-1">
                  {guesser.guesses.map((g, i) => (
                    <div
                      key={i}
                      className={`flex items-center justify-between text-sm px-2 py-1 rounded ${
                        g.isCorrect ? "bg-success/10" : "bg-error/10"
                      }`}
                    >
                      <span className="capitalize">
                        {g.field}: {g.value}
                      </span>
                      <span className={g.isCorrect ? "text-success" : "text-error"}>
                        {g.isCorrect ? `+${g.pointsAwarded.toFixed(1)}` : "\u2717"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
