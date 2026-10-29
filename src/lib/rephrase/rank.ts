import { tokenizeWords } from "../segment";
import type { RephraseCandidate } from "./types";

/** Lower is better: reward shortening, penalize many small edits over one clean rewrite. */
export function scoreCandidate(original: string, candidateText: string, editCount: number): number {
  const wordDelta = tokenizeWords(candidateText).length - tokenizeWords(original).length;
  return wordDelta + editCount * 0.5;
}

export function rankCandidates(candidates: RephraseCandidate[]): RephraseCandidate[] {
  const seen = new Set<string>();
  const deduped = candidates.filter((c) => {
    if (seen.has(c.text)) return false;
    seen.add(c.text);
    return true;
  });
  return deduped.sort((a, b) => a.score - b.score).slice(0, 3);
}
