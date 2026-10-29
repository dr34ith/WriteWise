import informalData from "../../../data/informalToFormal.json";
import { escapeRegExp, matchOutsideProtected } from "../../rules/helpers";
import type { ProtectedRange } from "../../types";
import { CONTRACTIONS } from "../contractions";
import type { RawEdit } from "../types";

interface InformalEntry {
  phrase: string;
  replacement: string;
  why: string;
}

const entries = informalData as InformalEntry[];

const CONTRACTION_REGEX = new RegExp(
  `\\b(${Object.keys(CONTRACTIONS).map(escapeRegExp).join("|")})\\b`,
  "gi",
);

/** Curated first-person -> impersonal verb templates (spec 6.6 item 5): only these verbs are
 * rewritten; any other first-person sentence is left for the user to rephrase manually. */
const FIRST_PERSON_VERBS: Record<string, string> = {
  found: "found",
  confirmed: "confirmed",
  discovered: "discovered",
  identified: "identified",
  observed: "observed",
  ran: "run",
  used: "used",
  scanned: "scanned",
  executed: "executed",
  reviewed: "reviewed",
  analyzed: "analyzed",
  verified: "verified",
};

const FIRST_PERSON_REGEX = new RegExp(
  `^(I|We)\\s+(${Object.keys(FIRST_PERSON_VERBS).join("|")})\\s+(.+)$`,
  "i",
);

function wordLevelEdits(sentenceText: string, protectedRanges: ProtectedRange[]): RawEdit[] {
  const edits: RawEdit[] = [];

  for (const m of matchOutsideProtected(CONTRACTION_REGEX, sentenceText, protectedRanges)) {
    const start = m.index ?? 0;
    const expansion = CONTRACTIONS[m[0].toLowerCase()];
    edits.push({
      span: { start, end: start + m[0].length },
      replacement: expansion,
      reason: `Expand contraction: "${m[0]}" -> "${expansion}"`,
    });
  }

  for (const entry of entries) {
    const regex = new RegExp(`\\b${escapeRegExp(entry.phrase)}\\b`, "gi");
    for (const m of matchOutsideProtected(regex, sentenceText, protectedRanges)) {
      const start = m.index ?? 0;
      edits.push({
        span: { start, end: start + m[0].length },
        replacement: entry.replacement,
        reason: entry.why,
      });
    }
  }

  return edits;
}

function firstPersonTemplateEdit(
  sentenceText: string,
  protectedRanges: ProtectedRange[],
): RawEdit[] {
  const match = FIRST_PERSON_REGEX.exec(sentenceText);
  if (!match) return [];
  // Refuse to rewrite if the matched span overlaps a protected range (e.g. the subject or
  // verb sits right at the edge of a code span) — too risky to reconstruct safely.
  const fullSpan = { start: 0, end: sentenceText.length };
  if (protectedRanges.some((r) => fullSpan.start < r.end && fullSpan.end > r.start && r.start === 0)) {
    return [];
  }

  const verb = match[2].toLowerCase();
  const rawObject = match[3];
  const trailingPunctMatch = /([.!?]+)\s*$/.exec(rawObject);
  const trailingPunct = trailingPunctMatch?.[1] ?? "";
  const object = trailingPunctMatch ? rawObject.slice(0, trailingPunctMatch.index).trimEnd() : rawObject;
  const pastParticiple = FIRST_PERSON_VERBS[verb];
  const capitalizedObject = object.charAt(0).toUpperCase() + object.slice(1);
  const replacement = `${capitalizedObject} was ${pastParticiple}${trailingPunct}`;

  return [
    {
      span: fullSpan,
      replacement,
      reason: `Rewrote first-person claim as an impersonal, evidence-style statement.`,
    },
  ];
}

export function generateFormal(sentenceText: string, protectedRanges: ProtectedRange[]): RawEdit[][] {
  const candidates: RawEdit[][] = [];

  const wordLevel = wordLevelEdits(sentenceText, protectedRanges);
  if (wordLevel.length > 0) candidates.push(wordLevel);

  const template = firstPersonTemplateEdit(sentenceText, protectedRanges);
  if (template.length > 0) candidates.push(template);

  return candidates;
}
