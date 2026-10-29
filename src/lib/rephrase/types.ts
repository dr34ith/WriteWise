import type { Span } from "../types";

export type RephraseStyle = "concise" | "formal" | "technical" | "plain" | "split";

export interface Change {
  before: string;
  after: string;
  span: Span; // offset within the original sentence text passed to rephrase()
  reason: string;
}

export interface RephraseCandidate {
  text: string;
  changes: Change[];
  score: number;
}

/** A single proposed edit against the original sentence text, before guard-checking. */
export interface RawEdit {
  span: Span;
  replacement: string;
  reason: string;
}
