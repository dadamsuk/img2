"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface GroupData {
  id: string;
  name: string;
  inviteCode: string;
  memberCount: number;
}

interface PuzzleInfo {
  id: string;
  turnDate: string;
  setterId: string;
  setterName: string;
}

export default function GroupDashboardPage() {
  const { id: groupId } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const [group, setGroup] = useState<GroupData | null>(null);
  const [puzzles, setPuzzles] = useState<PuzzleInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const groupsRes = await fetch("/api/groups");
        const groups = await groupsRes.json();
        const g = groups.find((g: GroupData) => g.id === groupId);
        if (g) setGroup(g);

        const puzzlesRes = await fetch(`/api/groups/${groupId}/puzzles`);
        if (puzzlesRes.ok) {
          setPuzzles(await puzzlesRes.json());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [groupId]);

  function copyInviteCode() {
    if (group) {
      navigator.clipboard.writeText(group.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="p-4">
        <p className="text-error">Group not found</p>
        <Link href="/" className="text-accent hover:underline">Back to dashboard</Link>
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const myPuzzleToday = puzzles.find(
    (p) => p.turnDate === today && p.setterId === session?.user?.id
  );
  const puzzlesToGuess = puzzles.filter(
    (p) => p.turnDate === today && p.setterId !== session?.user?.id
  );

  return (
    <div className="p-4">
      <Link href="/" className="text-sm text-muted hover:text-foreground mb-4 inline-block">
        &larr; Back
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{group.name}</h1>
        <Link
          href={`/groups/${groupId}/leaderboard`}
          className="text-sm text-accent hover:underline"
        >
          Leaderboard
        </Link>
      </div>

      <div className="rounded-lg bg-surface border border-border p-4 mb-6">
        <p className="text-sm text-muted mb-2">Invite Code</p>
        <div className="flex items-center gap-3">
          <span className="font-mono text-2xl tracking-widest text-accent">
            {group.inviteCode}
          </span>
          <button
            onClick={copyInviteCode}
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <p className="text-xs text-muted mt-2">
          {group.memberCount} member{group.memberCount !== 1 ? "s" : ""}
        </p>
      </div>

      <h2 className="text-lg font-semibold mb-3">Today</h2>

      <div className="space-y-3 mb-6">
        {!myPuzzleToday ? (
          <Link
            href={`/puzzles/new?groupId=${groupId}`}
            className="block rounded-lg bg-accent/10 border border-accent/30 p-4 hover:bg-accent/20 transition-colors"
          >
            <p className="font-semibold text-accent">Set Today&apos;s Puzzle</p>
            <p className="text-sm text-muted mt-1">Upload a photo and create clues</p>
          </Link>
        ) : (
          <Link
            href={`/puzzles/${myPuzzleToday.id}/activity`}
            className="block rounded-lg bg-surface border border-border p-4 hover:bg-surface-2 transition-colors"
          >
            <p className="font-semibold text-success">Puzzle Set!</p>
            <p className="text-sm text-muted mt-1">View activity &rarr;</p>
          </Link>
        )}

        {puzzlesToGuess.length > 0 ? (
          puzzlesToGuess.map((puzzle) => (
            <Link
              key={puzzle.id}
              href={`/puzzles/${puzzle.id}/play`}
              className="block rounded-lg bg-surface border border-border p-4 hover:bg-surface-2 transition-colors"
            >
              <p className="font-semibold">Guess {puzzle.setterName}&apos;s Puzzle</p>
              <p className="text-sm text-muted mt-1">Tap to play &rarr;</p>
            </Link>
          ))
        ) : (
          <div className="rounded-lg bg-surface border border-border p-4 text-muted text-sm">
            No puzzles to guess yet today
          </div>
        )}
      </div>
    </div>
  );
}
