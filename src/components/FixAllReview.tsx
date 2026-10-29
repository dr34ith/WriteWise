"use client";

import { useState } from "react";
import { CheckIcon, XIcon } from "@/components/icons";
import type { Issue } from "@/lib/types";

export interface FixAllReviewProps {
  selected: Issue[];
  skippedCount: number;
  onConfirm: (issuesToApply: Issue[]) => void;
  onCancel: () => void;
}

export function FixAllReview({ selected, skippedCount, onConfirm, onCancel }: FixAllReviewProps) {
  const [checked, setChecked] = useState<boolean[]>(() => selected.map(() => true));

  const toggle = (i: number) => {
    setChecked((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  };

  const checkedCount = checked.filter(Boolean).length;

  return (
    <div className="animate-pop-in absolute inset-0 z-10 flex flex-col overflow-auto bg-surface">
      <div className="border-b border-border p-3">
        <h2 className="text-sm font-semibold text-foreground">Review {selected.length} fix(es)</h2>
        {skippedCount > 0 && (
          <p className="mt-1 text-xs text-foreground-muted">
            {skippedCount} issue(s) needing manual review (warnings/errors, or overlapping another
            fix) were not included.
          </p>
        )}
      </div>
      <ul className="flex-1 divide-y divide-border overflow-auto">
        {selected.map((issue, i) => (
          <li key={issue.id} className="flex items-start gap-2 p-3 text-sm">
            <input
              type="checkbox"
              checked={checked[i]}
              onChange={() => toggle(i)}
              aria-label={`Apply fix: ${issue.message}`}
              className="mt-1"
            />
            <div>
              <p className="text-foreground">{issue.message}</p>
              <p className="mt-0.5 text-xs text-foreground-muted">
                &ldquo;{issue.suggestions[0].label || "(remove)"}&rdquo;
              </p>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex gap-2 border-t border-border p-3">
        <button
          type="button"
          onClick={() => onConfirm(selected.filter((_, i) => checked[i]))}
          disabled={checkedCount === 0}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground transition-transform duration-150 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
        >
          <CheckIcon className="h-4 w-4" />
          Apply {checkedCount} change{checkedCount === 1 ? "" : "s"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-foreground-muted transition-colors transition-transform duration-150 hover:scale-105 hover:bg-surface-muted hover:text-foreground active:scale-95"
        >
          <XIcon className="h-4 w-4" />
          Cancel
        </button>
      </div>
    </div>
  );
}
