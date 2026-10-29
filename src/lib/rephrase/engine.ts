import { findProtectedRanges } from "../protect";
import { applyEdits } from "./applyEdits";
import { passesGuard } from "./guards";
import { rankCandidates, scoreCandidate } from "./rank";
import { generateConcise } from "./styles/concise";
import { generateFormal } from "./styles/formal";
import { generatePlain } from "./styles/plain";
import { generateSplit } from "./styles/split";
import { generateTechnical } from "./styles/technical";
import type { RephraseCandidate, RephraseStyle } from "./types";

const HEDGE_REGEX =
  /\b(i think|i guess|i believe|maybe|perhaps|probably|seems like|might be|could be)\b/i;

const STYLE_GENERATORS: Record<RephraseStyle, typeof generateConcise> = {
  concise: generateConcise,
  formal: generateFormal,
  technical: generateTechnical,
  plain: generatePlain,
  split: generateSplit,
};

/**
 * Rule-based, offline, deterministic sentence rephraser. Returns up to 3 ranked candidates for
 * the given style, or an empty array if the sentence reads as an unsupported claim (hedging) —
 * rephrasing must never silently rewrite a claim that needs an evidence/confidence label
 * instead (see tone.hedging), or if no candidate survives the meaning-preservation guard.
 */
export function rephrase(sentenceText: string, style: RephraseStyle): RephraseCandidate[] {
  if (HEDGE_REGEX.test(sentenceText)) return [];

  const protectedRanges = findProtectedRanges(sentenceText);
  const generator = STYLE_GENERATORS[style];
  const rawCandidateSets = generator(sentenceText, protectedRanges);

  const candidates: RephraseCandidate[] = [];
  for (const edits of rawCandidateSets) {
    const { text, changes } = applyEdits(sentenceText, edits);
    if (text === sentenceText || changes.length === 0) continue;
    if (!passesGuard(sentenceText, text, protectedRanges)) continue;

    candidates.push({
      text,
      changes,
      score: scoreCandidate(sentenceText, text, changes.length),
    });
  }

  return rankCandidates(candidates);
}

export type { Change, RephraseCandidate, RephraseStyle } from "./types";
