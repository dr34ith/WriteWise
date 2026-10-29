import type { Change, RawEdit } from "./types";

export interface AppliedEdits {
  text: string;
  changes: Change[];
}

/**
 * Applies a set of non-overlapping edits to `original` in one forward pass. Overlapping edits
 * (by span) are resolved by discarding the later one, same "first-wins by position" rule as
 * src/lib/autofix.ts, so a style generator can propose edits without manually deduplicating.
 */
export function applyEdits(original: string, edits: RawEdit[]): AppliedEdits {
  const sorted = [...edits].sort((a, b) => a.span.start - b.span.start || a.span.end - b.span.end);
  const changes: Change[] = [];
  let result = "";
  let cursor = 0;
  let lastEnd = -1;

  for (const edit of sorted) {
    if (edit.span.start < lastEnd) continue; // overlaps an already-applied edit; skip
    result += original.slice(cursor, edit.span.start);
    const before = original.slice(edit.span.start, edit.span.end);
    result += edit.replacement;
    changes.push({ before, after: edit.replacement, span: edit.span, reason: edit.reason });
    cursor = edit.span.end;
    lastEnd = edit.span.end;
  }
  result += original.slice(cursor);

  return { text: result, changes };
}
