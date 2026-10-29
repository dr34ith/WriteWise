import { describe, expect, it } from "vitest";
import {
  findProtectedRanges,
  maskForLLM,
  unmask,
  validateTokens,
  isProtected,
} from "@/lib/protect";

function slice(text: string, r: { start: number; end: number }) {
  return text.slice(r.start, r.end);
}

describe("findProtectedRanges", () => {
  it("detects fenced code blocks", () => {
    const text = "Before\n```bash\nnmap -sV 10.0.0.1\n```\nAfter";
    const ranges = findProtectedRanges(text);
    const codeRange = ranges.find((r) => r.kind === "code-block");
    expect(codeRange).toBeDefined();
    expect(slice(text, codeRange!)).toContain("nmap -sV 10.0.0.1");
    expect(slice(text, codeRange!)).not.toContain("Before");
    expect(slice(text, codeRange!)).not.toContain("After");
  });

  it("detects ~~~ fences", () => {
    const text = "~~~\ncode here\n~~~";
    const ranges = findProtectedRanges(text);
    expect(ranges.some((r) => r.kind === "code-block")).toBe(true);
  });

  it("detects inline code and does not flag surrounding prose", () => {
    const text = "Run `nmap -sV` to scan.";
    const ranges = findProtectedRanges(text);
    const r = ranges.find((r) => r.kind === "inline-code");
    expect(r).toBeDefined();
    expect(slice(text, r!)).toBe("`nmap -sV`");
  });

  it("detects front matter at the start of the document only", () => {
    const text = "---\ntitle: Test\nlayout: post\n---\n\n# Hello";
    const ranges = findProtectedRanges(text);
    const fm = ranges.find((r) => r.kind === "frontmatter");
    expect(fm).toBeDefined();
    expect(fm!.start).toBe(0);
  });

  it("does not treat a mid-document --- as front matter", () => {
    const text = "# Title\n\nSome text\n\n---\n\nMore text";
    const ranges = findProtectedRanges(text);
    expect(ranges.some((r) => r.kind === "frontmatter")).toBe(false);
  });

  it("detects liquid tags", () => {
    const text = "{% include foo.html %} and {{ page.title }}";
    const ranges = findProtectedRanges(text);
    expect(ranges.filter((r) => r.kind === "liquid").length).toBe(2);
  });

  it("detects URLs including defanged hxxp", () => {
    const text = "See https://example.com/path and hxxps://evil.test/x";
    const ranges = findProtectedRanges(text);
    const urls = ranges.filter((r) => r.kind === "url");
    expect(urls.length).toBe(2);
  });

  it("protects only the URL inside a markdown link, not the link text", () => {
    const text = "Check [the docs](https://example.com/docs) for info.";
    const ranges = findProtectedRanges(text);
    const r = ranges.find((r) => r.kind === "md-link-target");
    expect(r).toBeDefined();
    expect(slice(text, r!)).toBe("https://example.com/docs");
  });

  it("detects email addresses", () => {
    const text = "Contact admin@example.com for access.";
    const ranges = findProtectedRanges(text);
    expect(ranges.some((r) => r.kind === "email")).toBe(true);
  });

  it("detects IPv4 addresses including defanged form", () => {
    const text = "The server at 10.0.0.1 talked to 1[.]2[.]3[.]4.";
    const ranges = findProtectedRanges(text);
    const ipv4s = ranges.filter((r) => r.kind === "ipv4");
    expect(ipv4s.length).toBe(2);
  });

  it("does not mistake a version string for an IPv4 address", () => {
    const text = "Upgrade to v1.2.3.4 of the tool.";
    const ranges = findProtectedRanges(text);
    expect(ranges.some((r) => r.kind === "ipv4")).toBe(false);
  });

  it("detects MAC addresses", () => {
    const text = "MAC: 00:1A:2B:3C:4D:5E was seen.";
    const ranges = findProtectedRanges(text);
    expect(ranges.some((r) => r.kind === "mac")).toBe(true);
  });

  it("detects hashes of each standard length", () => {
    const md5 = "a".repeat(32);
    const sha1 = "b".repeat(40);
    const sha256 = "c".repeat(64);
    const sha512 = "d".repeat(128);
    const text = `${md5} ${sha1} ${sha256} ${sha512}`;
    const ranges = findProtectedRanges(text);
    const hashes = ranges.filter((r) => r.kind === "hash");
    expect(hashes.length).toBe(4);
  });

  it("does not match a hex string that is part of a longer token", () => {
    const text = `x${"a".repeat(40)}y`;
    const ranges = findProtectedRanges(text);
    expect(ranges.some((r) => r.kind === "hash")).toBe(false);
  });

  it("detects CVE IDs", () => {
    const text = "This is tracked as CVE-2024-12345.";
    const ranges = findProtectedRanges(text);
    const r = ranges.find((r) => r.kind === "cve");
    expect(r).toBeDefined();
    expect(slice(text, r!)).toBe("CVE-2024-12345");
  });

  it("detects MITRE ATT&CK technique IDs", () => {
    const text = "The attacker used T1059.001 for execution.";
    const ranges = findProtectedRanges(text);
    const r = ranges.find((r) => r.kind === "mitre");
    expect(r).toBeDefined();
    expect(slice(text, r!)).toBe("T1059.001");
  });

  it("detects Windows event IDs contextually", () => {
    const text = "We observed Event ID 4624 in the security log.";
    const ranges = findProtectedRanges(text);
    expect(ranges.some((r) => r.kind === "event-id")).toBe(true);
  });

  it("detects Windows and Unix file paths, and registry keys", () => {
    const text = "Found at C:\\Users\\victim\\Desktop\\notes.txt and /var/log/auth.log, registry HKLM\\Software\\Evil";
    const ranges = findProtectedRanges(text);
    expect(ranges.some((r) => r.kind === "path")).toBe(true);
    expect(ranges.some((r) => r.kind === "registry")).toBe(true);
  });

  it("detects CTF flags", () => {
    const text = "The flag is htb{this_is_the_flag}.";
    const ranges = findProtectedRanges(text);
    const r = ranges.find((r) => r.kind === "flag");
    expect(r).toBeDefined();
    expect(slice(text, r!)).toBe("htb{this_is_the_flag}");
  });

  it("detects ISO 8601 timestamps", () => {
    const text = "Logged at 2024-10-12T14:05:00Z during the incident.";
    const ranges = findProtectedRanges(text);
    expect(ranges.some((r) => r.kind === "timestamp")).toBe(true);
  });

  it("merges overlapping ranges", () => {
    // A URL ends up inside a markdown link target AND matches the raw URL regex,
    // both should merge into a single protected range covering the full URL.
    const text = "[link](https://example.com/a/b/c)";
    const ranges = findProtectedRanges(text);
    const urlStart = text.indexOf("https://");
    const covering = ranges.filter((r) => r.start <= urlStart && r.end >= text.length - 1);
    expect(covering.length).toBeGreaterThanOrEqual(1);
  });

  it("handles a protected range at the very start and end of the text", () => {
    const text = "admin@example.com rest of sentence ends with 10.0.0.1";
    const ranges = findProtectedRanges(text);
    expect(ranges[0].start).toBe(0);
    const last = ranges[ranges.length - 1];
    expect(last.end).toBe(text.length);
  });

  it("handles Windows CRLF line endings in code blocks", () => {
    const text = "Before\r\n```\r\ncode line\r\n```\r\nAfter";
    const ranges = findProtectedRanges(text);
    expect(ranges.some((r) => r.kind === "code-block")).toBe(true);
  });

  it("handles unicode text without throwing and without false hash matches", () => {
    const text = "Investigación del incidente: contraseña café 日本語 テスト";
    expect(() => findProtectedRanges(text)).not.toThrow();
    const ranges = findProtectedRanges(text);
    expect(ranges.some((r) => r.kind === "hash")).toBe(false);
  });

  it("isProtected correctly reports positions inside and outside ranges", () => {
    const text = "safe `code` safe";
    const ranges = findProtectedRanges(text);
    const codeStart = text.indexOf("`code`");
    expect(isProtected(ranges, codeStart + 1)).toBe(true);
    expect(isProtected(ranges, 0)).toBe(false);
  });
});

describe("maskForLLM / unmask round-trip", () => {
  it("round-trips arbitrary text with protected ranges back to the original", () => {
    const text =
      "Attacker at 10.0.0.1 used CVE-2024-12345 and T1059.001.\n```\nnmap -sV 10.0.0.1\n```\nSee https://example.com for details.";
    const ranges = findProtectedRanges(text);
    const { masked, map } = maskForLLM(text, ranges);
    expect(unmask(masked, map)).toBe(text);
  });

  it("round-trips text with no protected ranges", () => {
    const text = "Just plain prose with nothing special in it.";
    const ranges = findProtectedRanges(text);
    const { masked, map } = maskForLLM(text, ranges);
    expect(masked).toBe(text);
    expect(unmask(masked, map)).toBe(text);
  });

  it("produces masked text with no original sensitive substrings left", () => {
    const text = "Contact admin@example.com about 10.0.0.1.";
    const ranges = findProtectedRanges(text);
    const { masked } = maskForLLM(text, ranges);
    expect(masked).not.toContain("admin@example.com");
    expect(masked).not.toContain("10.0.0.1");
  });
});

describe("validateTokens", () => {
  it("passes when every token appears exactly once", () => {
    const text = "Visit https://example.com now.";
    const ranges = findProtectedRanges(text);
    const { map } = maskForLLM(text, ranges);
    const llmOutput = "Please visit <<P1>> right now.";
    const result = validateTokens(map, llmOutput);
    expect(result.valid).toBe(true);
  });

  it("fails when a token is missing from the output", () => {
    const text = "Visit https://example.com now.";
    const ranges = findProtectedRanges(text);
    const { map } = maskForLLM(text, ranges);
    const result = validateTokens(map, "Please visit the website now.");
    expect(result.valid).toBe(false);
    expect(result.missing).toContain("<<P1>>");
  });

  it("fails when a token is duplicated in the output", () => {
    const text = "Visit https://example.com now.";
    const ranges = findProtectedRanges(text);
    const { map } = maskForLLM(text, ranges);
    const result = validateTokens(map, "<<P1>> and also <<P1>> again.");
    expect(result.valid).toBe(false);
    expect(result.duplicated).toContain("<<P1>>");
  });

  it("fails when an unknown token appears in the output", () => {
    const text = "Visit https://example.com now.";
    const ranges = findProtectedRanges(text);
    const { map } = maskForLLM(text, ranges);
    const result = validateTokens(map, "<<P1>> and <<P99>>.");
    expect(result.valid).toBe(false);
    expect(result.unknown).toContain("<<P99>>");
  });
});
