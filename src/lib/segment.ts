import type { ProtectedRange, Span } from "./types";
import { overlapsProtected } from "./protect";

export type BlockType = "heading" | "paragraph" | "list-item" | "table" | "code" | "blank";

export interface Block extends Span {
  type: BlockType;
  level?: number; // heading level 1-6
  text: string; // original text of the block (text.slice(start, end))
}

const ABBREVIATIONS = [
  "e.g.",
  "i.e.",
  "vs.",
  "etc.",
  "approx.",
  "dr.",
  "mr.",
  "mrs.",
  "ms.",
  "fig.",
  "no.",
  "vol.",
  "cf.",
  "et al.",
];

/** Splits markdown text into blocks (headings, paragraphs, list items, tables, code) with offsets. */
export function segmentBlocks(text: string, protectedRanges: ProtectedRange[]): Block[] {
  const blocks: Block[] = [];
  const lines = text.split(/\r?\n/);
  const lineStarts: number[] = [];
  {
    let idx = 0;
    while (idx <= text.length) {
      lineStarts.push(idx);
      const nl = text.indexOf("\n", idx);
      if (nl === -1) break;
      idx = nl + 1;
    }
  }

  let i = 0;
  let paraLines: string[] = [];
  let paraStartLine = -1;

  const flushParagraph = (endLineExclusive: number) => {
    if (paraLines.length === 0) return;
    const start = lineStarts[paraStartLine];
    const lastLineIdx = endLineExclusive - 1;
    const end = lineStarts[lastLineIdx] + lines[lastLineIdx].length;
    blocks.push({ type: "paragraph", start, end, text: text.slice(start, end) });
    paraLines = [];
    paraStartLine = -1;
  };

  while (i < lines.length) {
    const line = lines[i];
    const lineStart = lineStarts[i];
    const lineEnd = lineStart + line.length;

    const insideProtectedCode = overlapsProtected(protectedRanges, { start: lineStart, end: lineEnd }) &&
      protectedRanges.some(
        (r) => r.kind === "code-block" && lineStart >= r.start && lineEnd <= r.end + 1,
      );

    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(line);
    const tableRow = /^\s*\|.*\|\s*$/.test(line) || /^\s*[-:| ]+\s*$/.test(line) && line.includes("|");
    const listItem = /^\s*([-*+]|\d+[.)])\s+/.test(line);

    if (insideProtectedCode) {
      flushParagraph(i);
      // Extend/merge consecutive code lines into one code block entry.
      const start = lineStart;
      let j = i;
      while (
        j < lines.length &&
        overlapsProtected(protectedRanges, { start: lineStarts[j], end: lineStarts[j] + lines[j].length }) &&
        protectedRanges.some(
          (r) => r.kind === "code-block" && lineStarts[j] >= r.start && lineStarts[j] + lines[j].length <= r.end + 1,
        )
      ) {
        j++;
      }
      const lastLineIdx = j - 1;
      const end = lineStarts[lastLineIdx] + lines[lastLineIdx].length;
      blocks.push({ type: "code", start, end, text: text.slice(start, end) });
      i = j;
      continue;
    }

    if (line.trim() === "") {
      flushParagraph(i);
      blocks.push({ type: "blank", start: lineStart, end: lineEnd, text: line });
      i++;
      continue;
    }

    if (headingMatch) {
      flushParagraph(i);
      blocks.push({
        type: "heading",
        start: lineStart,
        end: lineEnd,
        level: headingMatch[1].length,
        text: line,
      });
      i++;
      continue;
    }

    if (tableRow) {
      flushParagraph(i);
      blocks.push({ type: "table", start: lineStart, end: lineEnd, text: line });
      i++;
      continue;
    }

    if (listItem) {
      flushParagraph(i);
      blocks.push({ type: "list-item", start: lineStart, end: lineEnd, text: line });
      i++;
      continue;
    }

    if (paraStartLine === -1) paraStartLine = i;
    paraLines.push(line);
    i++;
  }
  flushParagraph(lines.length);

  return blocks.sort((a, b) => a.start - b.start);
}

export function isProseBlock(block: Block): boolean {
  return block.type === "paragraph" || block.type === "list-item" || block.type === "heading";
}

export interface Sentence extends Span {
  text: string;
}

/**
 * Splits prose text into sentences with offsets, using Intl.Segmenter where available and
 * post-merging false splits caused by abbreviations and protected ranges (e.g. a URL or a
 * decimal version number containing a period should never end a sentence).
 */
export function segmentSentences(text: string, protectedRanges: ProtectedRange[]): Sentence[] {
  const raw: Span[] = [];

  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "sentence" });
    for (const seg of segmenter.segment(text)) {
      const start = seg.index;
      const end = start + seg.segment.length;
      raw.push({ start, end });
    }
  } else {
    // Fallback: split on sentence-ending punctuation followed by whitespace.
    let last = 0;
    const re = /[.!?]+(?=\s|$)/g;
    for (const m of text.matchAll(re)) {
      const end = (m.index ?? 0) + m[0].length;
      raw.push({ start: last, end });
      last = end;
    }
    if (last < text.length) raw.push({ start: last, end: text.length });
  }

  // Merge forward when a segment's trailing text is an abbreviation, or the split point sits
  // inside a protected range (e.g. a decimal in a version number or an IP address).
  const result: Span[] = [];
  for (const seg of raw) {
    const lastResult = result[result.length - 1];
    if (lastResult) {
      const boundary = lastResult.end;
      const prevText = text.slice(lastResult.start, lastResult.end).trim().toLowerCase();
      const endsWithAbbr = ABBREVIATIONS.some((abbr) => prevText.endsWith(abbr));
      const boundaryProtected = overlapsProtected(protectedRanges, { start: boundary - 1, end: boundary + 1 });
      if (endsWithAbbr || boundaryProtected) {
        lastResult.end = seg.end;
        continue;
      }
    }
    result.push({ ...seg });
  }

  return result
    .map((s) => ({ ...s, text: text.slice(s.start, s.end) }))
    .filter((s) => s.text.trim().length > 0);
}

export interface Word extends Span {
  text: string;
}

/** Tokenizes words with offsets; hyphenated and apostrophe words count as one token. */
export function tokenizeWords(text: string): Word[] {
  const re = /[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g;
  const words: Word[] = [];
  for (const m of text.matchAll(re)) {
    const start = m.index ?? 0;
    words.push({ start, end: start + m[0].length, text: m[0] });
  }
  return words;
}
