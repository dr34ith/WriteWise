"use client";

import { WandIcon } from "@/components/icons";
import type { Category, Issue, Severity } from "@/lib/types";

const SEVERITY_LABEL: Record<Severity, string> = {
  info: "Info",
  suggestion: "Suggestion",
  warning: "Warning",
  error: "Error",
};

const CATEGORY_LABEL: Record<Category, string> = {
  spelling: "Spelling",
  grammar: "Grammar",
  style: "Style",
  wordiness: "Wordiness",
  tone: "Tone",
  structure: "Structure",
  evidence: "Evidence",
  typography: "Typography",
  markdown: "Markdown",
  consistency: "Consistency",
  terminology: "Terminology",
};

export interface IssuePanelProps {
  issues: Issue[];
  onSelect: (issue: Issue) => void;
  onApply: (issue: Issue, replacement: string) => void;
  onIgnore: (issue: Issue) => void;
  onFixAll?: () => void;
  fixAllCount?: number;
}

const STAGGER_LIMIT = 10;

export function IssuePanel({
  issues,
  onSelect,
  onApply,
  onIgnore,
  onFixAll,
  fixAllCount = 0,
}: IssuePanelProps) {
  if (issues.length === 0) {
    return (
      <div className="p-4 text-sm text-foreground-muted">
        No issues found. Keep writing — checks run automatically as you type.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-auto">
      <div className="flex items-center justify-between border-b border-border px-4 py-2 text-xs text-foreground-muted">
        <span aria-live="polite">{issues.length} issue(s) found</span>
        {onFixAll && fixAllCount > 0 && (
          <span key={fixAllCount} className="animate-bounce-pop">
            <button
              type="button"
              onClick={onFixAll}
              className="inline-flex items-center gap-1 rounded-md border border-primary px-2 py-0.5 text-xs text-primary transition-colors transition-transform duration-150 hover:scale-105 hover:bg-primary hover:text-primary-foreground active:scale-95"
            >
              <WandIcon className="h-3.5 w-3.5" />
              Fix All ({fixAllCount})
            </button>
          </span>
        )}
      </div>
      <ul className="flex-1 divide-y divide-border">
        {issues.map((issue, index) => (
          <li
            key={issue.id}
            className="animate-fade-in p-3"
            style={index < STAGGER_LIMIT ? { animationDelay: `${index * 30}ms` } : undefined}
          >
            <button
              type="button"
              onClick={() => onSelect(issue)}
              className="block w-full text-left"
            >
              <div className="flex items-center gap-2 text-xs font-medium text-foreground-muted">
                <span>[{SEVERITY_LABEL[issue.severity]}]</span>
                <span>{CATEGORY_LABEL[issue.category]}</span>
                {issue.experimental && <span className="italic">experimental</span>}
              </div>
              <p className="mt-1 text-sm text-foreground">{issue.message}</p>
              <p className="mt-1 text-xs text-foreground-muted">{issue.why}</p>
              {issue.example && (
                <p className="mt-1 font-mono text-xs text-foreground-muted">{issue.example}</p>
              )}
            </button>
            <div className="mt-2 flex flex-wrap gap-2">
              {issue.suggestions.slice(0, 3).map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onApply(issue, s.replacement)}
                  className="rounded-md border border-border px-2 py-0.5 text-xs text-foreground-muted transition-colors transition-transform duration-150 hover:scale-105 hover:bg-surface-muted hover:text-foreground active:scale-95"
                >
                  {s.label || "(remove)"}
                </button>
              ))}
              <button
                type="button"
                onClick={() => onIgnore(issue)}
                className="rounded-md border border-transparent px-2 py-0.5 text-xs text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground"
              >
                Ignore
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
