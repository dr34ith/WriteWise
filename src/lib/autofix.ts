import type { Issue } from "./types";

export interface AutoFixPlan {
  selected: Issue[];
  skipped: Issue[];
}

const AUTO_FIXABLE_SEVERITIES = new Set(["suggestion", "info"]);

/**
 * Selects which issues "Fix All" can safely apply: must have a suggestion, and must not be a
 * warning/error (those need human judgment, per the "no auto-apply without review" principle —
 * the caller still shows every selected issue in a review list before committing).
 * Overlapping issues are resolved by position: the earlier-starting issue wins, later
 * overlapping ones are skipped this pass.
 */
export function planAutoFix(issues: Issue[]): AutoFixPlan {
  const eligible = issues.filter(
    (i) => i.suggestions.length > 0 && AUTO_FIXABLE_SEVERITIES.has(i.severity),
  );
  const sorted = [...eligible].sort(
    (a, b) => a.span.start - b.span.start || a.span.end - b.span.end,
  );

  const selected: Issue[] = [];
  const skipped: Issue[] = [];
  let lastEnd = -1;
  for (const issue of sorted) {
    if (issue.span.start >= lastEnd) {
      selected.push(issue);
      lastEnd = issue.span.end;
    } else {
      skipped.push(issue);
    }
  }
  return { selected, skipped };
}

export interface AutoFixResult {
  text: string;
  appliedIssueIds: string[];
}

/** Applies every selected issue's top suggestion in a single forward pass. `selected` must
 * already be sorted ascending by span.start and non-overlapping (see planAutoFix). */
export function applyAutoFix(text: string, selected: Issue[]): AutoFixResult {
  let result = "";
  let cursor = 0;
  for (const issue of selected) {
    result += text.slice(cursor, issue.span.start);
    result += issue.suggestions[0].replacement;
    cursor = issue.span.end;
  }
  result += text.slice(cursor);
  return { text: result, appliedIssueIds: selected.map((i) => i.id) };
}
