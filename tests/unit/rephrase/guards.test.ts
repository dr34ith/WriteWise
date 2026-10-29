import { describe, expect, it } from "vitest";
import { passesGuard } from "@/lib/rephrase/guards";
import { findProtectedRanges } from "@/lib/protect";

describe("passesGuard - positive cases (valid rewrites)", () => {
  it("passes a simple word substitution with no numbers/negations/modals involved", () => {
    const original = "The attacker used a trick to find the bug.";
    const candidate = "The attacker used a technique to find the vulnerability.";
    expect(passesGuard(original, candidate, [])).toBe(true);
  });

  it("passes a phrase shortening that keeps the same meaning", () => {
    const original = "In order to get access, I used nmap.";
    const candidate = "To get access, I used nmap.";
    expect(passesGuard(original, candidate, [])).toBe(true);
  });

  it("passes when a protected range is preserved verbatim", () => {
    const original = "Run `nmap -sV 10.0.0.1` to scan it.";
    const candidate = "Run `nmap -sV 10.0.0.1` to scan the host.";
    const ranges = findProtectedRanges(original);
    expect(passesGuard(original, candidate, ranges)).toBe(true);
  });

  it("passes when numbers are preserved in a different order (sentence split)", () => {
    const original = "Port 22 was open and port 80 was open too.";
    const candidate = "Port 22 was open. Port 80 was open too.";
    expect(passesGuard(original, candidate, [])).toBe(true);
  });

  it("passes contraction expansion that preserves negation (don't -> do not)", () => {
    const original = "We don't know the root cause yet.";
    const candidate = "We do not know the root cause yet.";
    expect(passesGuard(original, candidate, [])).toBe(true);
  });

  it("passes contraction expansion that preserves a modal (won't -> will not)", () => {
    const original = "The scan won't finish in time.";
    const candidate = "The scan will not finish in time.";
    expect(passesGuard(original, candidate, [])).toBe(true);
  });

  it("passes a rewrite within the sane length-ratio bounds", () => {
    const original = "The host was compromised via phishing.";
    const candidate = "The host was compromised via a phishing email.";
    expect(passesGuard(original, candidate, [])).toBe(true);
  });
});

describe("passesGuard - negative cases (must reject)", () => {
  it("rejects a rewrite that drops a number", () => {
    const original = "The scan found 3 open ports.";
    const candidate = "The scan found open ports.";
    expect(passesGuard(original, candidate, [])).toBe(false);
  });

  it("rejects a rewrite that changes a number", () => {
    const original = "The scan found 3 open ports.";
    const candidate = "The scan found 5 open ports.";
    expect(passesGuard(original, candidate, [])).toBe(false);
  });

  it("rejects a rewrite that drops a negation", () => {
    const original = "The server was not compromised.";
    const candidate = "The server was compromised.";
    expect(passesGuard(original, candidate, [])).toBe(false);
  });

  it("rejects a rewrite that flips a modal verb", () => {
    const original = "The attacker could escalate privileges.";
    const candidate = "The attacker will escalate privileges.";
    expect(passesGuard(original, candidate, [])).toBe(false);
  });

  it("rejects a rewrite that mutates a protected range", () => {
    const original = "Run `nmap -sV 10.0.0.1` now.";
    const candidate = "Run `nmap -sV 10.0.0.2` now.";
    const ranges = findProtectedRanges(original);
    expect(passesGuard(original, candidate, ranges)).toBe(false);
  });

  it("rejects a degenerate near-empty rewrite (length ratio too low)", () => {
    const original = "The attacker exploited a critical remote code execution vulnerability.";
    const candidate = "Bad.";
    expect(passesGuard(original, candidate, [])).toBe(false);
  });

  it("rejects a runaway rewrite (length ratio too high)", () => {
    const original = "It crashed.";
    const candidate =
      "It crashed unexpectedly during the middle of the overnight automated regression test suite run.";
    expect(passesGuard(original, candidate, [])).toBe(false);
  });
});
