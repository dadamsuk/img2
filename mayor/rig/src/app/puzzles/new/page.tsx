"use client";

import { Suspense, useState, useRef, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { v4 as uuid } from "uuid";

interface SubPortion {
  x: number;
  y: number;
  width: number;
  height: number;
}

const STEPS = [
  "Upload Photo",
  "Sub-portions",
  "Clue Photos",
  "Metadata",
  "Text Clues",
  "Review",
];

export default function SetterWizardPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" /></div>}>
      <SetterWizardContent />
    </Suspense>
  );
}

function SetterWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupId = searchParams.get("groupId") || "";
  const [step, setStep] = useState(0);
  const [puzzleId] = useState(uuid());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Photo
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [exifData, setExifData] = useState<{ dateTaken?: string; location?: string }>({});

  // Step 2: Sub-portions
  const [subPortions, setSubPortions] = useState<SubPortion[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });

  // Step 3: Clue photos
  const [cluePhotos, setCluePhotos] = useState<{ file: File; preview: string; url: string }[]>([]);

  // Step 4: Metadata
  const [answerWhat, setAnswerWhat] = useState("");
  const [answerWho, setAnswerWho] = useState("");
  const [answerWhere, setAnswerWhere] = useState("");
  const [answerWhen, setAnswerWhen] = useState("");
  const [whatNA, setWhatNA] = useState(false);
  const [whoNA, setWhoNA] = useState(false);
  const [whereNA, setWhereNA] = useState(false);
  const [whenNA, setWhenNA] = useState(false);

  // Step 5: Text clues
  const [textClues, setTextClues] = useState<string[]>([]);
  const [aiClues, setAiClues] = useState<string[]>([]);
  const [generatingClues, setGeneratingClues] = useState(false);
  const [newClue, setNewClue] = useState("");

  // Upload photo
  async function uploadPhoto(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("groupId", groupId);
    formData.append("puzzleId", puzzleId);

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  }

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setError("");

    try {
      setLoading(true);
      const result = await uploadPhoto(file);
      setPhotoUrl(result.url);
      if (result.exifData) setExifData(result.exifData);
    } catch (err) {
      setError("Failed to upload photo");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Sub-portion drawing
  const drawSubPortions = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = img.clientWidth;
    canvas.height = img.clientHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const sp of subPortions) {
      ctx.strokeStyle = "#F59E0B";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        sp.x * canvas.width / 100,
        sp.y * canvas.height / 100,
        sp.width * canvas.width / 100,
        sp.height * canvas.height / 100
      );
      ctx.fillStyle = "rgba(245, 158, 11, 0.15)";
      ctx.fillRect(
        sp.x * canvas.width / 100,
        sp.y * canvas.height / 100,
        sp.width * canvas.width / 100,
        sp.height * canvas.height / 100
      );
    }
  }, [subPortions]);

  useEffect(() => {
    if (step === 1) drawSubPortions();
  }, [step, subPortions, drawSubPortions]);

  function handleCanvasMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (subPortions.length >= 3) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    setDrawStart({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
    setIsDrawing(true);
  }

  function handleCanvasMouseUp(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    setIsDrawing(false);
    const rect = canvasRef.current!.getBoundingClientRect();
    const endX = ((e.clientX - rect.left) / rect.width) * 100;
    const endY = ((e.clientY - rect.top) / rect.height) * 100;

    const x = Math.min(drawStart.x, endX);
    const y = Math.min(drawStart.y, endY);
    const width = Math.abs(endX - drawStart.x);
    const height = Math.abs(endY - drawStart.y);

    if (width > 2 && height > 2) {
      setSubPortions([...subPortions, { x, y, width, height }]);
    }
  }

  // Clue photo upload
  async function handleCluePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || cluePhotos.length >= 3) return;

    const preview = URL.createObjectURL(file);
    try {
      setLoading(true);
      const result = await uploadPhoto(file);
      setCluePhotos([...cluePhotos, { file, preview, url: result.url }]);
    } catch (err) {
      setError("Failed to upload clue photo");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // AI clue generation
  async function generateAIClues() {
    if (!photoUrl) return;
    setGeneratingClues(true);
    try {
      const res = await fetch(`/api/puzzles/${puzzleId}/generate-clues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: photoUrl }),
      });
      const data = await res.json();
      if (res.ok && data.clues) {
        setAiClues(data.clues);
      } else {
        setError("Failed to generate clues");
      }
    } catch {
      setError("Failed to generate clues");
    } finally {
      setGeneratingClues(false);
    }
  }

  function addAIClue(clue: string) {
    if (textClues.length < 3 && !textClues.includes(clue)) {
      setTextClues([...textClues, clue]);
    }
  }

  function addManualClue() {
    if (newClue.trim() && textClues.length < 3) {
      setTextClues([...textClues, newClue.trim()]);
      setNewClue("");
    }
  }

  // Calculate total points
  const totalReveals = subPortions.length + cluePhotos.length + textClues.length;
  const totalPoints = 25 + totalReveals * 10;

  // Active fields count
  const activeFieldCount = [!whatNA, !whoNA, !whereNA, !whenNA].filter(Boolean).length;

  // Submit puzzle
  async function handleSubmit() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/puzzles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          subjectPhotoUrl: photoUrl,
          subPortions,
          cluePhotoUrls: cluePhotos.map((c) => c.url),
          answerWhat: whatNA ? null : answerWhat,
          answerWho: whoNA ? null : answerWho,
          answerWhere: whereNA ? null : answerWhere,
          answerWhen: whenNA ? null : answerWhen,
          textClues,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create puzzle");
        return;
      }

      router.push(`/groups/${groupId}`);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 pb-24">
      <Link
        href={`/groups/${groupId}`}
        className="text-sm text-muted hover:text-foreground mb-4 inline-block"
      >
        &larr; Back to group
      </Link>

      <h1 className="text-2xl font-bold mb-2">Set a Puzzle</h1>

      {/* Step indicator */}
      <div className="flex gap-1 mb-6">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1 flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                i === step
                  ? "bg-accent text-gray-900"
                  : i < step
                  ? "bg-success text-white"
                  : "bg-surface-2 text-muted"
              }`}
            >
              {i < step ? "\u2713" : i + 1}
            </div>
            <span className="text-[10px] text-muted mt-1 text-center leading-tight">{s}</span>
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-lg bg-error/10 p-3 text-sm text-error mb-4">{error}</div>
      )}

      {/* Step 1: Upload Photo */}
      {step === 0 && (
        <div className="space-y-4">
          <p className="text-muted">Upload the subject photo for your puzzle.</p>

          {!photoPreview ? (
            <label className="block rounded-lg border-2 border-dashed border-border p-12 text-center cursor-pointer hover:border-accent transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />
              <p className="text-lg font-semibold text-muted">Tap to upload</p>
              <p className="text-sm text-muted/50 mt-1">JPG, PNG, WebP</p>
            </label>
          ) : (
            <div className="space-y-3">
              <img src={photoPreview} alt="Preview" className="w-full rounded-lg" />
              {exifData.dateTaken && (
                <p className="text-sm text-muted">Date taken: {exifData.dateTaken}</p>
              )}
              {loading && <p className="text-sm text-accent">Uploading...</p>}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Sub-portions */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-muted">
            Draw up to 3 rectangular regions to reveal as clues. These will be shown
            one at a time when the guesser requests a reveal.
          </p>

          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={photoPreview}
              alt="Subject"
              className="w-full rounded-lg"
              onLoad={drawSubPortions}
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 cursor-crosshair"
              onMouseDown={handleCanvasMouseDown}
              onMouseUp={handleCanvasMouseUp}
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">
              {subPortions.length}/3 regions drawn
            </p>
            {subPortions.length > 0 && (
              <button
                onClick={() => setSubPortions(subPortions.slice(0, -1))}
                className="text-sm text-error hover:underline"
              >
                Undo last
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Clue Photos */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-muted">
            Upload up to 3 additional photos as clues (optional).
          </p>

          <div className="grid grid-cols-3 gap-3">
            {cluePhotos.map((cp, i) => (
              <div key={i} className="relative">
                <img src={cp.preview} alt={`Clue ${i + 1}`} className="w-full rounded-lg aspect-square object-cover" />
                <button
                  onClick={() => setCluePhotos(cluePhotos.filter((_, j) => j !== i))}
                  className="absolute top-1 right-1 w-6 h-6 bg-error rounded-full text-white text-xs flex items-center justify-center"
                >
                  &times;
                </button>
              </div>
            ))}
            {cluePhotos.length < 3 && (
              <label className="border-2 border-dashed border-border rounded-lg aspect-square flex items-center justify-center cursor-pointer hover:border-accent transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCluePhotoSelect}
                  className="hidden"
                />
                <span className="text-2xl text-muted">+</span>
              </label>
            )}
          </div>
          {loading && <p className="text-sm text-accent">Uploading...</p>}
        </div>
      )}

      {/* Step 4: Metadata */}
      {step === 3 && (
        <div className="space-y-4">
          <p className="text-muted">
            Enter the answers. Toggle N/A if a field doesn&apos;t apply.
          </p>

          {[
            { label: "What", value: answerWhat, set: setAnswerWhat, na: whatNA, setNA: setWhatNA, placeholder: "What is in the photo?" },
            { label: "Who", value: answerWho, set: setAnswerWho, na: whoNA, setNA: setWhoNA, placeholder: "Who is in the photo?" },
            { label: "Where", value: answerWhere, set: setAnswerWhere, na: whereNA, setNA: setWhereNA, placeholder: "Where was this taken?" },
            { label: "When", value: answerWhen, set: setAnswerWhen, na: whenNA, setNA: setWhenNA, placeholder: "When was this taken?" },
          ].map(({ label, value, set, na, setNA, placeholder }) => (
            <div key={label}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-muted">{label}</label>
                <button
                  onClick={() => setNA(!na)}
                  className={`text-xs px-2 py-0.5 rounded ${
                    na ? "bg-error/20 text-error" : "bg-surface-2 text-muted"
                  }`}
                >
                  N/A
                </button>
              </div>
              <input
                type="text"
                value={value}
                onChange={(e) => set(e.target.value)}
                disabled={na}
                className="w-full rounded-lg bg-surface border border-border px-4 py-2.5 text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-30"
                placeholder={na ? "Not applicable" : placeholder}
              />
            </div>
          ))}

          {activeFieldCount === 0 && (
            <p className="text-sm text-error">At least one field must be active</p>
          )}
        </div>
      )}

      {/* Step 5: Text Clues */}
      {step === 4 && (
        <div className="space-y-4">
          <p className="text-muted">
            Add up to 3 text clues. You can generate AI suggestions or write your own.
          </p>

          <button
            onClick={generateAIClues}
            disabled={generatingClues || !photoUrl}
            className="w-full rounded-lg bg-surface border border-accent text-accent py-2.5 font-semibold hover:bg-accent/10 disabled:opacity-50 transition-colors"
          >
            {generatingClues ? "Generating..." : "Generate AI Clues"}
          </button>

          {aiClues.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted">AI Suggestions (tap to add):</p>
              {aiClues.map((clue, i) => (
                <button
                  key={i}
                  onClick={() => addAIClue(clue)}
                  disabled={textClues.length >= 3 || textClues.includes(clue)}
                  className="w-full text-left rounded-lg bg-surface border border-border p-3 text-sm hover:bg-surface-2 disabled:opacity-30 transition-colors"
                >
                  {clue}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={newClue}
              onChange={(e) => setNewClue(e.target.value)}
              className="flex-1 rounded-lg bg-surface border border-border px-4 py-2.5 text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Write a clue..."
              onKeyDown={(e) => e.key === "Enter" && addManualClue()}
            />
            <button
              onClick={addManualClue}
              disabled={textClues.length >= 3 || !newClue.trim()}
              className="rounded-lg bg-accent px-4 py-2.5 font-semibold text-gray-900 disabled:opacity-50"
            >
              Add
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted">Selected clues ({textClues.length}/3):</p>
            {textClues.map((clue, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg bg-accent/10 border border-accent/30 p-3 text-sm"
              >
                <span>{clue}</span>
                <button
                  onClick={() => setTextClues(textClues.filter((_, j) => j !== i))}
                  className="text-error ml-2"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 6: Review */}
      {step === 5 && (
        <div className="space-y-4">
          <img src={photoPreview} alt="Subject" className="w-full rounded-lg" />

          <div className="rounded-lg bg-surface border border-border p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-muted">Sub-portions</span>
              <span className="font-mono">{subPortions.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Clue photos</span>
              <span className="font-mono">{cluePhotos.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Text clues</span>
              <span className="font-mono">{textClues.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Total reveals</span>
              <span className="font-mono">{totalReveals}</span>
            </div>
            <hr className="border-border" />
            <div className="flex justify-between text-lg font-bold">
              <span>Total Points</span>
              <span className="text-accent">{totalPoints}</span>
            </div>
          </div>

          <div className="rounded-lg bg-surface border border-border p-4 space-y-2">
            <h3 className="font-semibold">Answers</h3>
            {!whatNA && <p className="text-sm"><span className="text-muted">What:</span> {answerWhat}</p>}
            {!whoNA && <p className="text-sm"><span className="text-muted">Who:</span> {answerWho}</p>}
            {!whereNA && <p className="text-sm"><span className="text-muted">Where:</span> {answerWhere}</p>}
            {!whenNA && <p className="text-sm"><span className="text-muted">When:</span> {answerWhen}</p>}
          </div>

          {textClues.length > 0 && (
            <div className="rounded-lg bg-surface border border-border p-4 space-y-2">
              <h3 className="font-semibold">Text Clues</h3>
              {textClues.map((c, i) => (
                <p key={i} className="text-sm">{i + 1}. {c}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4">
        <div className="mx-auto max-w-[480px] flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 rounded-lg bg-surface border border-border py-2.5 font-semibold text-foreground"
            >
              Back
            </button>
          )}
          {step < 5 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={
                (step === 0 && !photoUrl) ||
                (step === 3 && activeFieldCount === 0) ||
                loading
              }
              className="flex-1 rounded-lg bg-accent py-2.5 font-semibold text-gray-900 hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 rounded-lg bg-accent py-2.5 font-semibold text-gray-900 hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {loading ? "Submitting..." : "Submit Puzzle"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
