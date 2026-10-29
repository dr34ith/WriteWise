import { describe, expect, it } from "vitest";
import { generateSplit } from "@/lib/rephrase/styles/split";
import { findProtectedRanges } from "@/lib/protect";

function run(text: string) {
  return generateSplit(text, findProtectedRanges(text));
}

describe("generateSplit - positive cases", () => {
  it("splits at ', and' when both sides have a verb phrase", () => {
    const result = run(
      "The attacker scanned the network, and the defender detected the activity quickly.",
    );
    expect(result.length).toBe(1);
  });

  it("splits at ', but' when both sides have a verb phrase", () => {
    const result = run("The scan finished quickly, but the report took much longer to write.");
    expect(result.length).toBe(1);
  });

  it("splits at ', so' when both sides have a verb phrase", () => {
    const result = run("The service crashed repeatedly, so the team rolled back the deployment.");
    expect(result.length).toBe(1);
  });

  it("splits at a semicolon when both sides have a verb phrase", () => {
    const result = run("The first scan completed quickly; the second scan took much longer.");
    expect(result.length).toBe(1);
  });

  it("capitalizes the start of the second sentence after splitting", () => {
    const result = run(
      "The attacker scanned the network, and the defender detected the activity quickly.",
    );
    expect(result[0][0].replacement).toContain(". The defender");
  });
});

describe("generateSplit - negative cases", () => {
  it("does not split a short sentence with no conjunction", () => {
    const result = run("The server crashed.");
    expect(result).toEqual([]);
  });

  it("does not split when the second half has no verb phrase", () => {
    const result = run("The attacker scanned the network, and the usual suspects.");
    expect(result).toEqual([]);
  });

  it("does not split when the first half has no verb phrase", () => {
    const result = run("The usual suspects, and the defender detected the activity.");
    expect(result).toEqual([]);
  });

  it("does not split at a conjunction inside a protected code block", () => {
    const text = "Intro.\n```\nfoo(); and bar();\n```\n";
    const result = generateSplit(text, findProtectedRanges(text));
    expect(result).toEqual([]);
  });

  it("does not split a sentence with only a comma and no coordinating conjunction", () => {
    const result = run("The attacker scanned the network, carefully and quietly.");
    expect(result).toEqual([]);
  });
});
