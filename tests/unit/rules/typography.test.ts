import { describe, expect, it } from "vitest";
import {
  doubleSpace,
  missingSpaceAfterPunct,
  sentenceNoEndPunct,
  spaceBeforePunct,
  unbalancedBrackets,
} from "@/lib/rules/typography";
import { findProtectedRanges } from "@/lib/protect";
import type { RuleContext } from "@/lib/types";

function ctxFor(text: string): RuleContext {
  return { text, mode: "blog-post", protectedRanges: findProtectedRanges(text) };
}

describe("typography.double-space", () => {
  it("flags two spaces between words", () => {
    const issues = doubleSpace.run(ctxFor("The host  responded quickly."));
    expect(issues.length).toBe(1);
  });

  it("flags three or more spaces", () => {
    const issues = doubleSpace.run(ctxFor("The host    responded."));
    expect(issues.length).toBe(1);
  });

  it("flags multiple double-space occurrences", () => {
    const issues = doubleSpace.run(ctxFor("One  two  three."));
    expect(issues.length).toBe(2);
  });

  it("does not flag single spaces", () => {
    const issues = doubleSpace.run(ctxFor("The host responded quickly."));
    expect(issues).toEqual([]);
  });

  it("does not flag leading indentation of a list item", () => {
    const issues = doubleSpace.run(ctxFor("  - indented item"));
    expect(issues).toEqual([]);
  });

  it("does not flag double spaces inside a code block", () => {
    const text = "Intro.\n```\nfoo  bar\n```\n";
    const issues = doubleSpace.run(ctxFor(text));
    expect(issues).toEqual([]);
  });
});

describe("typography.space-before-punct", () => {
  it("flags a space before a period", () => {
    const issues = spaceBeforePunct.run(ctxFor("This is a sentence ."));
    expect(issues.length).toBe(1);
  });

  it("flags a space before a comma", () => {
    const issues = spaceBeforePunct.run(ctxFor("First , second."));
    expect(issues.length).toBe(1);
  });

  it("flags a space before a question mark", () => {
    const issues = spaceBeforePunct.run(ctxFor("Is this correct ?"));
    expect(issues.length).toBe(1);
  });

  it("flags multiple occurrences", () => {
    const issues = spaceBeforePunct.run(ctxFor("One , two ; three ."));
    expect(issues.length).toBe(3);
  });

  it("does not flag normal punctuation spacing", () => {
    const issues = spaceBeforePunct.run(ctxFor("This is correct, and fine."));
    expect(issues).toEqual([]);
  });

  it("does not flag inside protected ranges", () => {
    const issues = spaceBeforePunct.run(ctxFor("Run `foo ()` now."));
    expect(issues).toEqual([]);
  });
});

describe("typography.missing-space-after-punct", () => {
  it("flags a missing space after a period", () => {
    const issues = missingSpaceAfterPunct.run(ctxFor("End of sentence.Next sentence starts."));
    expect(issues.length).toBe(1);
  });

  it("flags a missing space after a comma", () => {
    const issues = missingSpaceAfterPunct.run(ctxFor("First,second item."));
    expect(issues.length).toBe(1);
  });

  it("flags a missing space after a question mark", () => {
    const issues = missingSpaceAfterPunct.run(ctxFor("Is this it?Yes it is."));
    expect(issues.length).toBe(1);
  });

  it("does not flag normal sentence spacing", () => {
    const issues = missingSpaceAfterPunct.run(ctxFor("End of sentence. Next one starts."));
    expect(issues).toEqual([]);
  });

  it("does not flag a decimal number", () => {
    const issues = missingSpaceAfterPunct.run(ctxFor("The CVSS score was 7.5 overall."));
    expect(issues).toEqual([]);
  });

  it("does not flag inside a protected URL", () => {
    const issues = missingSpaceAfterPunct.run(ctxFor("See https://example.com/a,b for info."));
    expect(issues).toEqual([]);
  });
});

describe("typography.unbalanced-brackets-quotes", () => {
  it("flags an unclosed opening parenthesis", () => {
    const issues = unbalancedBrackets.run(ctxFor("This sentence has an (unclosed bracket."));
    expect(issues.length).toBe(1);
  });

  it("flags a stray closing bracket with no opener", () => {
    const issues = unbalancedBrackets.run(ctxFor("This sentence has a stray closing bracket)."));
    expect(issues.length).toBe(1);
  });

  it("flags mismatched bracket types", () => {
    const issues = unbalancedBrackets.run(ctxFor("This has a (mismatched bracket]."));
    expect(issues.length).toBeGreaterThanOrEqual(1);
  });

  it("does not flag correctly balanced parentheses", () => {
    const issues = unbalancedBrackets.run(ctxFor("This sentence is (fully balanced) and fine."));
    expect(issues).toEqual([]);
  });

  it("does not flag nested balanced brackets", () => {
    const issues = unbalancedBrackets.run(ctxFor("This has [nested (brackets) here] too."));
    expect(issues).toEqual([]);
  });

  it("does not flag brackets inside a fenced code block", () => {
    const text = "Intro.\n```\nfunction f( {\n```\n";
    const issues = unbalancedBrackets.run(ctxFor(text));
    expect(issues).toEqual([]);
  });
});

describe("typography.sentence-no-end-punct", () => {
  it("flags a paragraph with no terminal punctuation", () => {
    const issues = sentenceNoEndPunct.run(ctxFor("This paragraph never properly ends"));
    expect(issues.length).toBe(1);
  });

  it("does not flag a paragraph ending with a period", () => {
    const issues = sentenceNoEndPunct.run(ctxFor("This paragraph ends correctly."));
    expect(issues).toEqual([]);
  });

  it("does not flag a paragraph ending with a question mark", () => {
    const issues = sentenceNoEndPunct.run(ctxFor("Did this work correctly?"));
    expect(issues).toEqual([]);
  });

  it("does not flag headings (not paragraphs)", () => {
    const issues = sentenceNoEndPunct.run(ctxFor("# A Heading With No Punctuation"));
    expect(issues).toEqual([]);
  });

  it("does not flag a blank document", () => {
    const issues = sentenceNoEndPunct.run(ctxFor(""));
    expect(issues).toEqual([]);
  });
});
