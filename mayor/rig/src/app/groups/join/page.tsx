"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function JoinGroupPage() {
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: inviteCode.toUpperCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          router.push(`/groups/${data.groupId}`);
          return;
        }
        setError(data.error || "Failed to join group");
        return;
      }

      router.push(`/groups/${data.groupId}`);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4">
      <Link href="/" className="text-sm text-muted hover:text-foreground mb-4 inline-block">
        &larr; Back
      </Link>

      <h1 className="text-2xl font-bold mb-6">Join Group</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-error/10 p-3 text-sm text-error">{error}</div>
        )}

        <div>
          <label htmlFor="code" className="block text-sm font-medium text-muted mb-1">
            Invite Code
          </label>
          <input
            id="code"
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            className="w-full rounded-lg bg-surface border border-border px-4 py-2.5 text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent font-mono text-center text-2xl tracking-widest"
            placeholder="ABC123"
            maxLength={6}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-accent py-2.5 font-semibold text-gray-900 hover:bg-accent-hover disabled:opacity-50 transition-colors"
        >
          {loading ? "Joining..." : "Join Group"}
        </button>
      </form>
    </div>
  );
}
