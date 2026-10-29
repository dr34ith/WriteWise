import synonymsData from "../../../data/synonyms.json";
import { escapeRegExp, matchOutsideProtected } from "../../rules/helpers";
import type { ProtectedRange } from "../../types";
import type { RawEdit } from "../types";

interface SynonymEntry {
  word: string;
  register: "technical" | "plain";
  replacement: string;
  why: string;
}

const entries = synonymsData as SynonymEntry[];

export function generateSynonymStyle(
  sentenceText: string,
  protectedRanges: ProtectedRange[],
  register: "technical" | "plain",
): RawEdit[][] {
  const edits: RawEdit[] = [];
  for (const entry of entries) {
    if (entry.register !== register) continue;
    const regex = new RegExp(`\\b${escapeRegExp(entry.word)}\\b`, "gi");
    for (const m of matchOutsideProtected(regex, sentenceText, protectedRanges)) {
      const start = m.index ?? 0;
      edits.push({
        span: { start, end: start + m[0].length },
        replacement: entry.replacement,
        reason: entry.why,
      });
    }
  }
  return edits.length > 0 ? [edits] : [];
}
