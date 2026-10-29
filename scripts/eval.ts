/**
 * Corpus evaluation: runs the rule engine over corpus/samples and reports
 * issues-per-1000-words per rule, for manual false-positive review.
 * Populated once the rule catalogue exists (Phase 2+).
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { analyze } from "../src/lib/engine";

const corpusDir = join(process.cwd(), "corpus", "samples");

async function main() {
  const files = readdirSync(corpusDir).filter((f) => f.endsWith(".md"));
  if (files.length === 0) {
    console.log("No corpus samples found in corpus/samples/.");
    return;
  }

  const counts = new Map<string, number>();
  let totalWords = 0;

  for (const file of files) {
    const text = readFileSync(join(corpusDir, file), "utf-8");
    totalWords += text.split(/\s+/).filter(Boolean).length;
    // Note: spelling.misspelled is skipped here (no /dictionaries/* static route in this
    // Node script context), so this eval only covers the non-spelling rule families.
    const { issues } = await analyze({ text, mode: "blog-post" });
    for (const issue of issues) {
      counts.set(issue.ruleId, (counts.get(issue.ruleId) ?? 0) + 1);
    }
  }

  console.log(`Corpus: ${files.length} files, ${totalWords} words\n`);
  console.log("ruleId,issuesPer1000Words");
  for (const [ruleId, count] of counts) {
    console.log(`${ruleId},${((count / totalWords) * 1000).toFixed(2)}`);
  }
}

main();
