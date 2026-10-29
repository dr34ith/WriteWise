import wordinessData from "../../../data/wordiness.json";
import { FILLER_WORDS } from "../../rules/filler";
import { escapeRegExp, matchOutsideProtected } from "../../rules/helpers";
import type { ProtectedRange } from "../../types";
import type { RawEdit } from "../types";

interface WordinessEntry {
  phrase: string;
  replacement: string;
}

const entries = wordinessData as WordinessEntry[];
const FILLER_REGEX = new RegExp(`\\b(${FILLER_WORDS.join("|")})\\s?`, "gi");

export function generateConcise(sentenceText: string, protectedRanges: ProtectedRange[]): RawEdit[][] {
  const edits: RawEdit[] = [];

  for (const entry of entries) {
    const regex = new RegExp(`\\b${escapeRegExp(entry.phrase)}\\b`, "gi");
    for (const m of matchOutsideProtected(regex, sentenceText, protectedRanges)) {
      const start = m.index ?? 0;
      edits.push({
        span: { start, end: start + m[0].length },
        replacement: entry.replacement,
        reason: `Wordy phrase: "${m[0]}" -> "${entry.replacement}"`,
      });
    }
  }

  for (const m of matchOutsideProtected(FILLER_REGEX, sentenceText, protectedRanges)) {
    const start = m.index ?? 0;
    edits.push({
      span: { start, end: start + m[0].length },
      replacement: "",
      reason: `Removed filler word: "${m[1]}"`,
    });
  }

  return edits.length > 0 ? [edits] : [];
}
