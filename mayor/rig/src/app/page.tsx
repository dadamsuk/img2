"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";

interface Group {
  id: string;
  name: string;
  inviteCode: string;
  memberCount: number;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then(setGroups)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col min-h-screen p-4">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-accent">Photo Puzzle</h1>
          <p className="text-sm text-muted">Welcome, {session?.user?.name}</p>
        </div>
        <button
          onClick={() => signOut()}
          className="text-sm text-muted hover:text-foreground transition-colors"
        >
          Sign out
        </button>
      </header>

      <div className="flex gap-3 mb-6">
        <Link
          href="/groups/new"
          className="flex-1 rounded-lg bg-accent py-2.5 text-center font-semibold text-gray-900 hover:bg-accent-hover transition-colors"
        >
          Create Group
        </Link>
        <Link
          href="/groups/join"
          className="flex-1 rounded-lg bg-surface border border-border py-2.5 text-center font-semibold text-foreground hover:bg-surface-2 transition-colors"
        >
          Join Group
        </Link>
      </div>

      <h2 className="text-lg font-semibold mb-3">Your Groups</h2>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-12 text-muted">
          <p className="text-lg mb-2">No groups yet</p>
          <p className="text-sm">Create or join a group to start playing!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              className="block rounded-lg bg-surface border border-border p-4 hover:bg-surface-2 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{group.name}</h3>
                  <p className="text-sm text-muted">
                    {group.memberCount} member{group.memberCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="text-sm text-muted font-mono">
                  {group.inviteCode}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
