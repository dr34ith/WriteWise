import type { ProtectedRange } from "../../types";
import type { RawEdit } from "../types";
import { generateSynonymStyle } from "./synonymStyle";

export function generatePlain(sentenceText: string, protectedRanges: ProtectedRange[]): RawEdit[][] {
  return generateSynonymStyle(sentenceText, protectedRanges, "plain");
}
