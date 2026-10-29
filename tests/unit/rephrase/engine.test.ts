import { describe, expect, it } from "vitest";
import { rephrase } from "@/lib/rephrase/engine";

describe("rephrase - concise", () => {
  it("matches the spec's 'in order to' golden example", () => {
    const candidates = rephrase("In order to get access, I used nmap.", "concise");
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].text.toLowerCase()).toBe("to get access, i used nmap.");
  });

  it("matches the spec's 'due to the fact that' golden example", () => {
    const candidates = rephrase(
      "Due to the fact that the logs were missing, it was hard to know the root cause.",
      "concise",
    );
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].text).toBe(
      "because the logs were missing, it was hard to know the root cause.",
    );
  });

  it("removes a filler word", () => {
    const candidates = rephrase("The vulnerability was very severe.", "concise");
    expect(candidates.some((c) => !c.text.includes("very"))).toBe(true);
  });

  it("does not rewrite inside a protected range", () => {
    const candidates = rephrase("Run `in order to debug this` now.", "concise");
    expect(candidates.every((c) => c.text.includes("`in order to debug this`"))).toBe(true);
  });

  it("returns no candidates for a sentence with nothing to simplify", () => {
    const candidates = rephrase("The server crashed after the request.", "concise");
    expect(candidates).toEqual([]);
  });
});

describe("rephrase - hedging refusal (mandatory per spec acceptance sample)", () => {
  it("returns zero candidates for a hedging claim regardless of style", () => {
    const text = "I think the attacker maybe used a phishing email.";
    for (const style of ["concise", "formal", "technical", "plain", "split"] as const) {
      expect(rephrase(text, style)).toEqual([]);
    }
  });

  it("refuses sentences with 'probably'", () => {
    expect(rephrase("The malware probably came from a phishing email.", "formal")).toEqual([]);
  });

  it("refuses sentences with 'perhaps'", () => {
    expect(rephrase("Perhaps the attacker used a zero-day.", "formal")).toEqual([]);
  });

  it("refuses sentences with 'seems like'", () => {
    expect(rephrase("It seems like the server was compromised.", "formal")).toEqual([]);
  });

  it("refuses sentences with 'might be'", () => {
    expect(rephrase("This might be a false positive.", "formal")).toEqual([]);
  });
});

describe("rephrase - formal", () => {
  it("expands a contraction", () => {
    const candidates = rephrase("We don't know the root cause yet.", "formal");
    expect(candidates.some((c) => c.text.includes("do not"))).toBe(true);
  });

  it("replaces an informal word", () => {
    const candidates = rephrase("The attacker got access to the server.", "formal");
    expect(candidates.some((c) => c.text.includes("obtained"))).toBe(true);
  });

  it("rewrites a first-person finding as an impersonal statement", () => {
    const candidates = rephrase("I found a vulnerability in the login form.", "formal");
    const template = candidates.find((c) => c.text.startsWith("A vulnerability"));
    expect(template).toBeDefined();
    expect(template!.text).toBe("A vulnerability in the login form was found.");
  });

  it("rewrites 'we ran X' using the curated verb table", () => {
    const candidates = rephrase("We ran nmap against the host.", "formal");
    expect(candidates.some((c) => c.text === "Nmap against the host was run.")).toBe(true);
  });

  it("does not apply the first-person template for an unlisted verb", () => {
    const candidates = rephrase("I wonder about the root cause.", "formal");
    expect(candidates.every((c) => !c.text.startsWith("The root cause"))).toBe(true);
  });
});

describe("rephrase - technical", () => {
  it("replaces a plain word with a technical term", () => {
    const candidates = rephrase("We used a trick to find the bug.", "technical");
    expect(candidates.some((c) => c.text.includes("technique"))).toBe(true);
  });

  it("returns no candidates when no technical synonym matches", () => {
    const candidates = rephrase("The weather was nice yesterday.", "technical");
    expect(candidates).toEqual([]);
  });
});

describe("rephrase - plain", () => {
  it("replaces jargon with an everyday word", () => {
    const candidates = rephrase("We leveraged the vulnerability to exfiltrate data.", "plain");
    expect(candidates.some((c) => c.text.includes("steal"))).toBe(true);
  });

  it("returns no candidates when there is no jargon to simplify", () => {
    const candidates = rephrase("The cat sat on the mat.", "plain");
    expect(candidates).toEqual([]);
  });
});

describe("rephrase - split", () => {
  it("splits a long sentence joined by 'and' with a verb on both sides", () => {
    const candidates = rephrase(
      "The attacker scanned the network, and the defender detected the activity quickly.",
      "split",
    );
    expect(candidates.length).toBe(1);
    expect(candidates[0].text).toBe(
      "The attacker scanned the network. The defender detected the activity quickly.",
    );
  });

  it("does not split a short sentence with no conjunction", () => {
    const candidates = rephrase("The server crashed.", "split");
    expect(candidates).toEqual([]);
  });

  it("does not split when one side has no verb phrase", () => {
    const candidates = rephrase("The attacker scanned the network, and the usual suspects.", "split");
    expect(candidates).toEqual([]);
  });
});
