// Copies the Hunspell dictionary files (MIT/BSD licensed, see each dir's `license` file) from
// node_modules into public/dictionaries so the browser (and the analysis Web Worker) can fetch
// them at runtime, since dictionary-en/-gb read via node:fs and don't work unbundled in the
// browser. Re-run automatically via the "postinstall" script.
import { copyFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const pairs = [
  ["dictionary-en", "en"],
  ["dictionary-en-gb", "en-gb"],
];

async function main() {
  for (const [pkg, dir] of pairs) {
    const srcDir = join("node_modules", pkg);
    const destDir = join("public", "dictionaries", dir);
    if (!existsSync(srcDir)) {
      console.warn(`Skipping ${pkg}: not installed.`);
      continue;
    }
    await mkdir(destDir, { recursive: true });
    for (const file of ["index.aff", "index.dic", "license"]) {
      await copyFile(join(srcDir, file), join(destDir, file));
    }
  }
  console.log("Dictionary files copied to public/dictionaries/.");
}

main();
