import type { ProtectedKind, ProtectedRange, Span } from "./types";

interface RawMatch extends Span {
  kind: ProtectedKind;
}

function pushMatches(regex: RegExp, text: string, kind: ProtectedKind, out: RawMatch[]) {
  for (const m of text.matchAll(regex)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    if (end > start) out.push({ start, end, kind });
  }
}

// --- Front matter (YAML block at the very start of the document) ---
function findFrontMatter(text: string, out: RawMatch[]) {
  const m = /^---\r?\n[\s\S]*?\r?\n---(\r?\n|$)/.exec(text);
  if (m && m.index === 0) {
    out.push({ start: 0, end: m[0].length, kind: "frontmatter" });
  }
}

// --- Fenced code blocks (``` or ~~~) and inline code (`...`) ---
function findCodeBlocks(text: string, out: RawMatch[]) {
  const fence = /^([ \t]*)(`{3,}|~{3,})[^\n]*\r?\n([\s\S]*?)\r?\n\1\2[ \t]*(?=\r?\n|$)/gm;
  const fenceRanges: Span[] = [];
  for (const m of text.matchAll(fence)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    fenceRanges.push({ start, end });
    out.push({ start, end, kind: "code-block" });
  }

  // Indented code blocks: consecutive non-blank lines each indented >=4 spaces/1 tab,
  // preceded by a blank line (or start of text), not already inside a fence.
  const lines = text.split(/\r?\n/);
  let offset = 0;
  const lineStarts: number[] = [];
  for (const line of lines) {
    lineStarts.push(offset);
    offset += line.length + 1; // approximate; refined below with actual newline length
  }
  // Recompute offsets precisely accounting for \r\n vs \n.
  offset = 0;
  const preciseStarts: number[] = [];
  let idx = 0;
  while (idx <= text.length) {
    preciseStarts.push(idx);
    const nl = text.indexOf("\n", idx);
    if (nl === -1) break;
    idx = nl + 1;
  }

  const isIndented = (line: string) => /^(\t| {4,})/.test(line);
  let i = 0;
  const isInsideFence = (pos: number) =>
    fenceRanges.some((r) => pos >= r.start && pos < r.end);
  while (i < lines.length) {
    if (isIndented(lines[i]) && lines[i].trim().length > 0) {
      const blockStartLine = i;
      let j = i;
      while (j < lines.length && (isIndented(lines[j]) || lines[j].trim() === "")) {
        j++;
      }
      // trim trailing blank lines from the block
      let lastNonBlank = j - 1;
      while (lastNonBlank > blockStartLine && lines[lastNonBlank].trim() === "") lastNonBlank--;
      const prevBlank = blockStartLine === 0 || lines[blockStartLine - 1].trim() === "";
      if (prevBlank) {
        const start = preciseStarts[blockStartLine] ?? 0;
        const endLineIdx = lastNonBlank;
        const end =
          (preciseStarts[endLineIdx] ?? text.length) + lines[endLineIdx].length;
        if (!isInsideFence(start)) {
          out.push({ start, end, kind: "code-block" });
        }
      }
      i = j;
    } else {
      i++;
    }
  }

  // Inline code spans: `code` (single or multiple backticks), not spanning fences.
  const inline = /(`+)([^`\n]+?)\1/g;
  for (const m of text.matchAll(inline)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    if (!isInsideFence(start)) out.push({ start, end, kind: "inline-code" });
  }
}

// --- Liquid tags: {% ... %} and {{ ... }} ---
function findLiquid(text: string, out: RawMatch[]) {
  pushMatches(/\{%[^%]*?%\}/g, text, "liquid", out);
  pushMatches(/\{\{[^}]*?\}\}/g, text, "liquid", out);
}

// --- Markdown link/image targets: capture only the URL part ---
function findMdLinkTargets(text: string, out: RawMatch[]) {
  const re = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  for (const m of text.matchAll(re)) {
    const full = m[0];
    const url = m[1];
    const fullStart = m.index ?? 0;
    const urlStart = fullStart + full.indexOf(url);
    out.push({ start: urlStart, end: urlStart + url.length, kind: "md-link-target" });
  }
}

// --- URLs (http/https/ftp, and defanged hxxp) ---
function findUrls(text: string, out: RawMatch[]) {
  const re = /\b(?:https?|ftp|hxxps?):\/\/[^\s<>"')\]]+/gi;
  pushMatches(re, text, "url", out);
}

// --- Email addresses ---
function findEmails(text: string, out: RawMatch[]) {
  const re = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  pushMatches(re, text, "email", out);
}

// --- IPv4 (including defanged 1[.]2[.]3[.]4), IPv6, MAC addresses ---
function findIps(text: string, out: RawMatch[]) {
  const octet = "(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)";
  const dot = "(?:\\.|\\[\\.\\])";
  const ipv4 = new RegExp(`\\b${octet}${dot}${octet}${dot}${octet}${dot}${octet}\\b`, "g");
  for (const m of text.matchAll(ipv4)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    // Guard against version strings like v1.2.3.4 immediately preceded by a letter/'v'.
    const before = text[start - 1];
    if (before && /[A-Za-z]/.test(before)) continue;
    out.push({ start, end, kind: "ipv4" });
  }

  const ipv6 = /\b(?:[A-Fa-f0-9]{1,4}:){2,7}[A-Fa-f0-9]{1,4}\b/g;
  for (const m of text.matchAll(ipv6)) {
    const groups = m[0].split(":");
    const looksLikeMac = groups.length === 6 && groups.every((g) => g.length === 2);
    // Must contain at least 2 colons and look like an address, not a timestamp like 14:05:00
    // or a MAC address (exactly 6 groups of exactly 2 hex digits).
    if ((m[0].match(/:/g) ?? []).length >= 2 && /[A-Fa-f]/.test(m[0]) && !looksLikeMac) {
      const start = m.index ?? 0;
      out.push({ start, end: start + m[0].length, kind: "ipv6" });
    }
  }

  const mac = /\b[0-9A-Fa-f]{2}(?:[:-][0-9A-Fa-f]{2}){5}\b/g;
  pushMatches(mac, text, "mac", out);
}

// --- Hashes: hex strings of exactly length 32/40/64/128, not part of a longer token ---
function findHashes(text: string, out: RawMatch[]) {
  for (const len of [128, 64, 40, 32]) {
    const re = new RegExp(`(?<![A-Za-z0-9])[A-Fa-f0-9]{${len}}(?![A-Za-z0-9])`, "g");
    pushMatches(re, text, "hash", out);
  }
}

// --- CVE IDs ---
function findCves(text: string, out: RawMatch[]) {
  pushMatches(/\bCVE-\d{4}-\d{4,}\b/gi, text, "cve", out);
}

// --- MITRE ATT&CK technique IDs ---
function findMitre(text: string, out: RawMatch[]) {
  pushMatches(/\bT\d{4}(?:\.\d{3})?\b/g, text, "mitre", out);
}

// --- Windows event IDs (contextual) ---
function findEventIds(text: string, out: RawMatch[]) {
  pushMatches(/\bEvent\s?ID\s*:?\s*\d{3,5}\b/gi, text, "event-id", out);
}

// --- File paths and registry keys ---
function findPaths(text: string, out: RawMatch[]) {
  const windowsPath = /\b[A-Za-z]:\\(?:[^\s\\/:*?"<>|\r\n]+\\)*[^\s\\/:*?"<>|\r\n]*/g;
  pushMatches(windowsPath, text, "path", out);
  const registry = /\bHK(?:LM|CU|CR|U|CC)\\[^\s]+/g;
  pushMatches(registry, text, "registry", out);
  const unixPath = /(?:(?<=\s)|^)\/(?:[\w.-]+\/)+[\w.-]+/g;
  pushMatches(unixPath, text, "path", out);
}

// --- CTF flags: default pattern word{...} ---
function findFlags(text: string, out: RawMatch[], flagPattern?: RegExp) {
  const re = flagPattern ?? /\b\w{2,10}\{[^}]+\}/g;
  pushMatches(new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g"), text, "flag", out);
}

// --- Timestamps: ISO 8601 and common log formats ---
function findTimestamps(text: string, out: RawMatch[]) {
  const iso =
    /\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?\b/g;
  pushMatches(iso, text, "timestamp", out);
  const clock = /\b\d{1,2}:\d{2}(:\d{2})?\s?(AM|PM|am|pm)?\b/g;
  pushMatches(clock, text, "timestamp", out);
  const usDate = /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g;
  pushMatches(usDate, text, "timestamp", out);
}

export interface ProtectOptions {
  flagPattern?: RegExp;
}

export function findProtectedRanges(text: string, options: ProtectOptions = {}): ProtectedRange[] {
  const raw: RawMatch[] = [];

  findFrontMatter(text, raw);
  findCodeBlocks(text, raw);
  findLiquid(text, raw);
  findMdLinkTargets(text, raw);
  findUrls(text, raw);
  findEmails(text, raw);
  findIps(text, raw);
  findHashes(text, raw);
  findCves(text, raw);
  findMitre(text, raw);
  findEventIds(text, raw);
  findPaths(text, raw);
  findFlags(text, raw, options.flagPattern);
  findTimestamps(text, raw);

  return mergeRanges(raw);
}

/** Merge overlapping/adjacent ranges. Priority on kind follows insertion order (earlier = higher). */
function mergeRanges(raw: RawMatch[]): ProtectedRange[] {
  if (raw.length === 0) return [];
  const sorted = [...raw].sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: ProtectedRange[] = [];
  for (const r of sorted) {
    const last = merged[merged.length - 1];
    if (last && r.start <= last.end) {
      if (r.end > last.end) last.end = r.end;
    } else {
      merged.push({ start: r.start, end: r.end, kind: r.kind });
    }
  }
  return merged;
}

export function isProtected(ranges: ProtectedRange[], pos: number): boolean {
  return ranges.some((r) => pos >= r.start && pos < r.end);
}

export function overlapsProtected(ranges: ProtectedRange[], span: Span): boolean {
  return ranges.some((r) => span.start < r.end && span.end > r.start);
}

// --- LLM masking ---

export interface MaskMap {
  [token: string]: { original: string; kind: ProtectedKind };
}

export interface MaskResult {
  masked: string;
  map: MaskMap;
}

export function maskForLLM(text: string, ranges: ProtectedRange[]): MaskResult {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  let result = "";
  let cursor = 0;
  const map: MaskMap = {};
  sorted.forEach((r, i) => {
    const token = `<<P${i + 1}>>`;
    result += text.slice(cursor, r.start);
    result += token;
    map[token] = { original: text.slice(r.start, r.end), kind: r.kind };
    cursor = r.end;
  });
  result += text.slice(cursor);
  return { masked: result, map };
}

export function unmask(masked: string, map: MaskMap): string {
  let result = masked;
  for (const [token, { original }] of Object.entries(map)) {
    result = result.split(token).join(original);
  }
  return result;
}

export interface TokenValidationResult {
  valid: boolean;
  missing: string[];
  duplicated: string[];
  unknown: string[];
}

export function validateTokens(map: MaskMap, llmOutput: string): TokenValidationResult {
  const missing: string[] = [];
  const duplicated: string[] = [];
  const expectedTokens = Object.keys(map);

  for (const token of expectedTokens) {
    const count = countOccurrences(llmOutput, token);
    if (count === 0) missing.push(token);
    else if (count > 1) duplicated.push(token);
  }

  const unknown: string[] = [];
  const tokenRe = /<<P\d+>>/g;
  for (const m of llmOutput.matchAll(tokenRe)) {
    if (!expectedTokens.includes(m[0])) unknown.push(m[0]);
  }

  return {
    valid: missing.length === 0 && duplicated.length === 0 && unknown.length === 0,
    missing,
    duplicated,
    unknown: [...new Set(unknown)],
  };
}

function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  let pos = 0;
  while (true) {
    const idx = haystack.indexOf(needle, pos);
    if (idx === -1) break;
    count++;
    pos = idx + needle.length;
  }
  return count;
}
