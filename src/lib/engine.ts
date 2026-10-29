import glossaryData from "../data/glossary.json";
import { findProtectedRanges } from "./protect";
import { runRules } from "./rules";
import { simpleHash } from "./rules/helpers";
import { loadSpellChecker, type EnglishVariant } from "./spelling";
import type { DocMode, Issue } from "./types";

export interface AnalyzeRequest {
  text: string;
  mode: DocMode;
  englishVariant?: EnglishVariant;
  userDictionary?: string[];
}

export interface AnalyzeResult {
  issues: Issue[];
}

const glossaryWords = new Set<string>(
  (glossaryData as string[]).flatMap((term) => term.toLowerCase().split(/\s+/)),
);

const CACHE_LIMIT = 20;
const resultCache = new Map<string, AnalyzeResult>();

function cacheKey(req: AnalyzeRequest): string {
  const dict = (req.userDictionary ?? []).join(",");
  return `${req.mode}:${req.englishVariant ?? "us"}:${simpleHash(dict)}:${simpleHash(req.text)}`;
}

export async function analyze(req: AnalyzeRequest): Promise<AnalyzeResult> {
  const key = cacheKey(req);
  const cached = resultCache.get(key);
  if (cached) return cached;

  const protectedRanges = findProtectedRanges(req.text);

  let spellChecker;
  try {
    spellChecker = await loadSpellChecker(req.englishVariant ?? "us");
  } catch {
    // Degrade gracefully (e.g. no network/fetch available, such as in some test environments):
    // every other rule family still runs.
    spellChecker = undefined;
  }

  const issues = runRules({
    text: req.text,
    mode: req.mode,
    protectedRanges,
    spellChecker,
    userDictionary: req.userDictionary
      ? new Set(req.userDictionary.map((w) => w.toLowerCase()))
      : undefined,
    glossaryTerms: glossaryWords,
  });

  const result: AnalyzeResult = { issues };
  resultCache.set(key, result);
  if (resultCache.size > CACHE_LIMIT) {
    const oldestKey = resultCache.keys().next().value;
    if (oldestKey !== undefined) resultCache.delete(oldestKey);
  }
  return result;
}
