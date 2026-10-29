import { describe, expect, it } from "vitest";
import { analyze } from "@/lib/engine";

describe("analyze", () => {
  it("returns no issues for clean, short prose with no dictionary available", async () => {
    // In this test environment there is no /dictionaries/* static route to fetch from, so the
    // spell checker fails to load and the engine degrades gracefully (spelling rule is skipped).
    const result = await analyze({ text: "Hello world.", mode: "blog-post" });
    expect(result.issues).toEqual([]);
  });

  it("flags a wordy phrase outside of protected ranges", async () => {
    const result = await analyze({
      text: "In order to scan the host, run `nmap -sV in order to be thorough`.",
      mode: "blog-post",
    });
    const wordy = result.issues.filter((i) => i.ruleId === "wordiness.phrase");
    expect(wordy.length).toBe(1);
  });
});
