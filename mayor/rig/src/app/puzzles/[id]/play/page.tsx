"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface PlayData {
  puzzle: {
    id: string;
    subjectPhotoUrl: string;
    turnDate: string;
    totalPoints: number;
    setterName: string;
  };
  session: {
    id: string;
    status: string;
    revealsUsed: number;
    score: number;
  };
  activeFields: string[];
  correctFields: Record<string, boolean>;
  revealed: {
    subPortions: Array<{ x: number; y: number; width: number; height: number }>;
    cluePhotos: string[];
    textClues: string[];
  };
  availableReveals: {
    subPortions: number;
    cluePhotos: number;
    textClues: number;
  };
  pointsPerField: number;
  previousGuesses: Array<{
    field: string;
    value: string;
    isCorrect: boolean;
    pointsAwarded: number;
    reasoning: string;
  }>;
}

interface GuessResult {
  field: string;
  value: string;
  isCorrect: boolean;
  pointsAwarded: number;
  reasoning: string;
}

export default function PlayPage() {
  const { id: puzzleId } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<PlayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<GuessResult[]>([]);
  const [concedeData, setConcedeData] = useState<{
    guesserScore: number;
    setterScore: number;
    answers: Record<string, string | null>;
    subjectPhotoUrl: string;
  } | null>(null);
  const [showRevealMenu, setShowRevealMenu] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadPuzzle();
  }, [puzzleId]);

  async function loadPuzzle() {
    try {
      const res = await fetch(`/api/puzzles/${puzzleId}/play`);
      const d = await res.json();
      setData(d);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitGuess() {
    if (!data) return;
    const validAnswers: Record<string, string> = {};
    for (const field of data.activeFields) {
      if (!data.correctFields[field] && answers[field]?.trim()) {
        validAnswers[field] = answers[field].trim();
      }
    }
    if (Object.keys(validAnswers).length === 0) return;

    setSubmitting(true);
    setResults([]);

    try {
      const res = await fetch(`/api/puzzles/${puzzleId}/guess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: validAnswers }),
      });

      const result = await res.json();
      setResults(result.results);

      // Reload puzzle state
      await loadPuzzle();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReveal(type: string) {
    setShowRevealMenu(false);
    try {
      await fetch(`/api/puzzles/${puzzleId}/reveal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      await loadPuzzle();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleConcede() {
    if (!confirm("Are you sure you want to concede? The setter will get the remaining points.")) return;
    try {
      const res = await fetch(`/api/puzzles/${puzzleId}/concede`, {
        method: "POST",
      });
      const result = await res.json();
      setConcedeData(result);
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4">
        <p className="text-error">Failed to load puzzle</p>
        <Link href="/" className="text-accent hover:underline">Back</Link>
      </div>
    );
  }

  // Concede view
  if (concedeData) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Puzzle Conceded</h1>

        <img
          src={concedeData.subjectPhotoUrl}
          alt="Full photo"
          className="w-full rounded-lg mb-4 cursor-pointer"
          onClick={() => setFullscreenImage(concedeData.subjectPhotoUrl)}
        />

        <div className="rounded-lg bg-surface border border-border p-4 space-y-2 mb-4">
          <h3 className="font-semibold">Answers</h3>
          {concedeData.answers.what && <p className="text-sm"><span className="text-muted">What:</span> {concedeData.answers.what}</p>}
          {concedeData.answers.who && <p className="text-sm"><span className="text-muted">Who:</span> {concedeData.answers.who}</p>}
          {concedeData.answers.where && <p className="text-sm"><span className="text-muted">Where:</span> {concedeData.answers.where}</p>}
          {concedeData.answers.when && <p className="text-sm"><span className="text-muted">When:</span> {concedeData.answers.when}</p>}
        </div>

        <div className="rounded-lg bg-surface border border-border p-4 space-y-2 mb-4">
          <div className="flex justify-between">
            <span className="text-muted">Your score</span>
            <span className="font-bold">{concedeData.guesserScore.toFixed(1)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Setter&apos;s score</span>
            <span className="font-bold">{concedeData.setterScore.toFixed(1)}</span>
          </div>
        </div>

        <Link
          href="/"
          className="block w-full rounded-lg bg-accent py-2.5 text-center font-semibold text-gray-900"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  // Completed view
  if (data.session.status === "completed") {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold text-success mb-4">Puzzle Complete!</h1>

        <img
          src={data.puzzle.subjectPhotoUrl}
          alt="Subject"
          className="w-full rounded-lg mb-4 cursor-pointer"
          onClick={() => setFullscreenImage(data.puzzle.subjectPhotoUrl)}
        />

        <div className="rounded-lg bg-surface border border-border p-4 mb-4">
          <p className="text-lg font-bold text-center">
            Your score: <span className="text-accent">{data.session.score.toFixed(1)}</span>
          </p>
          <p className="text-sm text-muted text-center mt-1">
            out of {data.puzzle.totalPoints} points
          </p>
        </div>

        <Link
          href="/"
          className="block w-full rounded-lg bg-accent py-2.5 text-center font-semibold text-gray-900"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const totalAvailableReveals =
    data.availableReveals.subPortions +
    data.availableReveals.cluePhotos +
    data.availableReveals.textClues;

  return (
    <div className="p-4 pb-48">
      <div className="flex items-center justify-between mb-4">
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          &larr; Back
        </Link>
        <div className="text-right">
          <p className="text-sm text-muted">by {data.puzzle.setterName}</p>
          <p className="text-xs text-muted">{data.pointsPerField.toFixed(1)} pts/field</p>
        </div>
      </div>

      {/* Subject photo */}
      <div ref={imageContainerRef} className="relative mb-4">
        <img
          src={data.puzzle.subjectPhotoUrl}
          alt="Puzzle"
          className="w-full rounded-lg cursor-pointer"
          onClick={() => setFullscreenImage(data.puzzle.subjectPhotoUrl)}
        />
        {/* Draw revealed sub-portions */}
        {data.revealed.subPortions.map((sp, i) => (
          <div
            key={i}
            className="absolute border-2 border-accent bg-accent/10"
            style={{
              left: `${sp.x}%`,
              top: `${sp.y}%`,
              width: `${sp.width}%`,
              height: `${sp.height}%`,
            }}
          />
        ))}
      </div>

      {/* Revealed clue photos */}
      {data.revealed.cluePhotos.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-muted mb-2">Clue Photos</p>
          <div className="grid grid-cols-3 gap-2">
            {data.revealed.cluePhotos.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`Clue ${i + 1}`}
                className="w-full rounded-lg aspect-square object-cover cursor-pointer"
                onClick={() => setFullscreenImage(url)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Revealed text clues */}
      {data.revealed.textClues.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-sm text-muted">Text Clues</p>
          {data.revealed.textClues.map((clue, i) => (
            <div key={i} className="rounded-lg bg-accent/10 border border-accent/30 p-3 text-sm">
              {clue}
            </div>
          ))}
        </div>
      )}

      {/* Score info */}
      <div className="rounded-lg bg-surface border border-border p-3 mb-4 flex justify-between text-sm">
        <span className="text-muted">Reveals used: {data.session.revealsUsed}</span>
        <span className="text-muted">Score: {data.session.score.toFixed(1)}</span>
      </div>

      {/* Latest results */}
      {results.length > 0 && (
        <div className="mb-4 space-y-2">
          {results.map((r, i) => (
            <div
              key={i}
              className={`rounded-lg border p-3 ${
                r.isCorrect
                  ? "bg-success/10 border-success/30"
                  : "bg-error/10 border-error/30"
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold capitalize">{r.field}</span>
                <span className={r.isCorrect ? "text-success" : "text-error"}>
                  {r.isCorrect ? `+${r.pointsAwarded.toFixed(1)}` : "Incorrect"}
                </span>
              </div>
              <p className="text-sm text-muted mt-1">{r.reasoning}</p>
            </div>
          ))}
        </div>
      )}

      {/* Guess form */}
      <div className="space-y-3 mb-4">
        {data.activeFields.map((field) => (
          <div key={field}>
            <label className="block text-sm font-medium text-muted mb-1 capitalize">
              {field}
              {data.correctFields[field] && (
                <span className="text-success ml-2">Correct!</span>
              )}
            </label>
            <input
              type="text"
              value={data.correctFields[field] ? "" : (answers[field] || "")}
              onChange={(e) => setAnswers({ ...answers, [field]: e.target.value })}
              disabled={!!data.correctFields[field]}
              className="w-full rounded-lg bg-surface border border-border px-4 py-2.5 text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-30 disabled:bg-success/10"
              placeholder={data.correctFields[field] ? "Answered correctly" : `Your guess for ${field}...`}
            />
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4">
        <div className="mx-auto max-w-[480px] space-y-2">
          <button
            onClick={handleSubmitGuess}
            disabled={submitting || Object.values(answers).every((a) => !a?.trim())}
            className="w-full rounded-lg bg-accent py-2.5 font-semibold text-gray-900 hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {submitting ? "Evaluating..." : "Submit Guess"}
          </button>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <button
                onClick={() => setShowRevealMenu(!showRevealMenu)}
                disabled={totalAvailableReveals === 0}
                className="w-full rounded-lg bg-surface border border-border py-2 text-sm font-semibold text-foreground disabled:opacity-30"
              >
                Reveal ({totalAvailableReveals})
              </button>
              {showRevealMenu && (
                <div className="absolute bottom-full left-0 right-0 mb-2 rounded-lg bg-surface border border-border shadow-lg overflow-hidden">
                  {data.availableReveals.subPortions > 0 && (
                    <button
                      onClick={() => handleReveal("sub_portion")}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-surface-2"
                    >
                      Sub-portion ({data.availableReveals.subPortions})
                    </button>
                  )}
                  {data.availableReveals.cluePhotos > 0 && (
                    <button
                      onClick={() => handleReveal("clue_photo")}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-surface-2"
                    >
                      Clue Photo ({data.availableReveals.cluePhotos})
                    </button>
                  )}
                  {data.availableReveals.textClues > 0 && (
                    <button
                      onClick={() => handleReveal("text_clue")}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-surface-2"
                    >
                      Text Clue ({data.availableReveals.textClues})
                    </button>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleConcede}
              className="flex-1 rounded-lg bg-error/10 border border-error/30 py-2 text-sm font-semibold text-error"
            >
              Concede
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen image viewer */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
          onClick={() => setFullscreenImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white text-3xl z-50"
            onClick={() => setFullscreenImage(null)}
          >
            &times;
          </button>
          <img
            src={fullscreenImage}
            alt="Fullscreen"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
