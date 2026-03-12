import type { InferSelectModel } from "drizzle-orm";
import type { puzzles } from "./schema";

type Puzzle = InferSelectModel<typeof puzzles>;

export interface ScoringResult {
  guesserScore: number;
  setterScore: number;
  fieldScores: Record<string, number>;
}

function getActiveFields(puzzle: Puzzle): string[] {
  const fields: string[] = [];
  if (puzzle.answerWhat !== null) fields.push("what");
  if (puzzle.answerWho !== null) fields.push("who");
  if (puzzle.answerWhere !== null) fields.push("where");
  if (puzzle.answerWhen !== null) fields.push("when");
  return fields;
}

/** Total points available = 25 + (numReveals * 10) */
export function calculateTotalPoints(numReveals: number): number {
  return 25 + numReveals * 10;
}

/** Points per field at a given reveal level */
export function pointsPerField(totalPoints: number, activeFieldCount: number): number {
  if (activeFieldCount === 0) return 0;
  return totalPoints / activeFieldCount;
}

/** Calculate points for a correct guess at current reveal level */
export function calculateFieldPoints(
  revealsUsed: number,
  activeFieldCount: number,
  totalBasePoints: number
): number {
  const currentTotal = Math.max(totalBasePoints - revealsUsed * 10, 0);
  return pointsPerField(currentTotal, activeFieldCount);
}

/** Calculate final scores for a completed/conceded session */
export function calculateFinalScores(
  puzzle: Puzzle,
  revealsUsed: number,
  correctFields: Record<string, { points: number }>,
  conceded: boolean
): ScoringResult {
  const activeFields = getActiveFields(puzzle);
  const totalPoints = puzzle.totalPoints;

  const fieldScores: Record<string, number> = {};
  let guesserTotal = 0;

  for (const field of activeFields) {
    if (correctFields[field]) {
      fieldScores[field] = correctFields[field].points;
      guesserTotal += correctFields[field].points;
    } else {
      fieldScores[field] = 0;
    }
  }

  // Setter gets total - guesser score
  const setterScore = totalPoints - guesserTotal;

  return {
    guesserScore: guesserTotal,
    setterScore: Math.max(setterScore, 0),
    fieldScores,
  };
}

/** Calculate points available for current guess attempt */
export function currentPointsPerField(
  totalBasePoints: number,
  revealsUsed: number,
  activeFieldCount: number
): number {
  const current = Math.max(totalBasePoints - revealsUsed * 10, 0);
  return activeFieldCount > 0 ? current / activeFieldCount : 0;
}
