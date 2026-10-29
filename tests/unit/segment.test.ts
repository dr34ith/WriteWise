import { describe, expect, it } from "vitest";
import { segmentBlocks, segmentSentences, tokenizeWords, isProseBlock } from "@/lib/segment";
import { findProtectedRanges } from "@/lib/protect";

function assertOffsets(text: string, spans: { start: number; end: number; text: string }[]) {
  for (const s of spans) {
    expect(text.slice(s.start, s.end)).toBe(s.text);
  }
}

describe("segmentBlocks", () => {
  it("identifies headings with their level", () => {
    const text = "# Title\n\nSome paragraph text.\n\n## Subheading\n";
    const blocks = segmentBlocks(text, []);
    const h1 = blocks.find((b) => b.type === "heading" && b.level === 1);
    const h2 = blocks.find((b) => b.type === "heading" && b.level === 2);
    expect(h1).toBeDefined();
    expect(h2).toBeDefined();
    assertOffsets(text, blocks.filter((b) => b.type === "heading"));
  });

  it("identifies paragraphs, merging consecutive lines", () => {
    const text = "Line one of a paragraph.\nLine two continues it.\n\nNext paragraph.";
    const blocks = segmentBlocks(text, []);
    const paragraphs = blocks.filter((b) => b.type === "paragraph");
    expect(paragraphs.length).toBe(2);
    expect(paragraphs[0].text).toContain("Line one");
    expect(paragraphs[0].text).toContain("Line two");
    assertOffsets(text, paragraphs);
  });

  it("identifies list items", () => {
    const text = "- first item\n- second item\n1. numbered item\n";
    const blocks = segmentBlocks(text, []);
    const items = blocks.filter((b) => b.type === "list-item");
    expect(items.length).toBe(3);
    assertOffsets(text, items);
  });

  it("identifies table rows", () => {
    const text = "| A | B |\n| - | - |\n| 1 | 2 |\n";
    const blocks = segmentBlocks(text, []);
    const rows = blocks.filter((b) => b.type === "table");
    expect(rows.length).toBe(3);
  });

  it("marks fenced code block lines as code, not paragraph", () => {
    const text = "Intro text.\n\n```bash\nnmap -sV target\n```\n\nOutro text.";
    const ranges = findProtectedRanges(text);
    const blocks = segmentBlocks(text, ranges);
    const codeBlocks = blocks.filter((b) => b.type === "code");
    expect(codeBlocks.length).toBeGreaterThan(0);
    expect(codeBlocks.some((b) => b.text.includes("nmap -sV target"))).toBe(true);
    const paragraphs = blocks.filter((b) => b.type === "paragraph");
    expect(paragraphs.some((b) => b.text.includes("nmap"))).toBe(false);
  });

  it("every block's text matches text.slice(start, end)", () => {
    const text =
      "# Heading\n\nA paragraph with **bold** text.\n\n- item one\n- item two\n\n```\ncode\n```\n";
    const ranges = findProtectedRanges(text);
    const blocks = segmentBlocks(text, ranges);
    assertOffsets(text, blocks);
  });

  it("isProseBlock excludes code and tables", () => {
    const text = "# H\n\npara\n\n```\ncode\n```\n\n| a | b |\n";
    const ranges = findProtectedRanges(text);
    const blocks = segmentBlocks(text, ranges);
    for (const b of blocks) {
      if (b.type === "code" || b.type === "table" || b.type === "blank") {
        expect(isProseBlock(b)).toBe(false);
      }
    }
    expect(blocks.some((b) => b.type === "heading" && isProseBlock(b))).toBe(true);
  });
});

describe("segmentSentences", () => {
  it("splits simple sentences", () => {
    const text = "This is one sentence. This is another one.";
    const sentences = segmentSentences(text, []);
    expect(sentences.length).toBe(2);
    assertOffsets(text, sentences);
  });

  it("does not split on abbreviations like e.g. or i.e.", () => {
    const text = "We checked tools (e.g. Nmap) during recon. It helped a lot.";
    const sentences = segmentSentences(text, []);
    expect(sentences.length).toBe(2);
    assertOffsets(text, sentences);
  });

  it("does not split inside a protected range such as a URL", () => {
    const text = "See https://example.com/a.b.c for info. Thanks.";
    const ranges = findProtectedRanges(text);
    const sentences = segmentSentences(text, ranges);
    expect(sentences.length).toBe(2);
    expect(sentences[0].text).toContain("https://example.com/a.b.c");
    assertOffsets(text, sentences);
  });

  it("does not split inside a version number embedded in protected ranges context", () => {
    const text = "Logged at 2024-10-12T14:05:00Z during the event. Confirmed.";
    const ranges = findProtectedRanges(text);
    const sentences = segmentSentences(text, ranges);
    assertOffsets(text, sentences);
    expect(sentences.length).toBe(2);
  });

  it("offsets always match the original text exactly", () => {
    const text = "First sentence here. Second one! Third? Fourth.";
    const sentences = segmentSentences(text, []);
    assertOffsets(text, sentences);
  });
});

describe("tokenizeWords", () => {
  it("tokenizes plain words with offsets", () => {
    const text = "The quick brown fox";
    const words = tokenizeWords(text);
    expect(words.map((w) => w.text)).toEqual(["The", "quick", "brown", "fox"]);
    assertOffsets(text, words);
  });

  it("treats hyphenated words as a single token", () => {
    const text = "privilege-escalation detected";
    const words = tokenizeWords(text);
    expect(words[0].text).toBe("privilege-escalation");
  });

  it("treats apostrophe words as a single token", () => {
    const text = "attacker's machine";
    const words = tokenizeWords(text);
    expect(words[0].text).toBe("attacker's");
  });
});
