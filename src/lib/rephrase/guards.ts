import type { ProtectedRange } from "../types";
import { tokenizeWords } from "../segment";
import { normalizeContractions } from "./contractions";

const NEGATIONS = ["not", "no", "never", "cannot", "without"];
const MODALS = ["can", "could", "may", "might", "must", "should", "will", "would", "shall"];

function wordCounts(text: string, vocabulary: string[]): Map<string, number> {
  const words = tokenizeWords(text).map((w) => w.text.toLowerCase());
  const counts = new Map<string, number>();
  for (const word of vocabulary) {
    counts.set(word, 0);
  }
  for (const word of words) {
    if (counts.has(word)) counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return counts;
}

/**
 * Compares word counts after normalizing contractions on both sides first — so expanding
 * "won't" -> "will not" (a deliberate, meaning-preserving rewrite the formal style performs)
 * doesn't look like it invented a "will" or lost a negation. A genuine meaning change (e.g.
 * dropping "not" entirely) still shows up as a mismatch after normalization.
 */
function countsMatch(before: string, after: string, vocabulary: string[]): boolean {
  const beforeCounts = wordCounts(normalizeContractions(before), vocabulary);
  const afterCounts = wordCounts(normalizeContractions(after), vocabulary);
  for (const word of vocabulary) {
    if (beforeCounts.get(word) !== afterCounts.get(word)) return false;
  }
  return true;
}

const MIN_LENGTH_RATIO = 0.4;
const MAX_LENGTH_RATIO = 1.8;

/**
 * Meaning-preservation guard: a candidate rewrite must keep every protected-range substring
 * intact, preserve the same numbers/negations/modal verbs, and stay within a sane length ratio
 * of the original. Any failure discards the candidate — callers never see it.
 */
export function passesGuard(
  original: string,
  candidateText: string,
  protectedRanges: ProtectedRange[],
): boolean {
  for (const range of protectedRanges) {
    const snippet = original.slice(range.start, range.end);
    if (snippet.trim().length > 0 && !candidateText.includes(snippet)) return false;
  }

  const numsBefore = (original.match(/\d+(\.\d+)?/g) ?? []).slice().sort();
  const numsAfter = (candidateText.match(/\d+(\.\d+)?/g) ?? []).slice().sort();
  if (numsBefore.join(",") !== numsAfter.join(",")) return false;

  if (!countsMatch(original, candidateText, NEGATIONS)) return false;
  if (!countsMatch(original, candidateText, MODALS)) return false;

  const ratio = candidateText.length / Math.max(1, original.length);
  if (ratio < MIN_LENGTH_RATIO || ratio > MAX_LENGTH_RATIO) return false;

  return true;
}
