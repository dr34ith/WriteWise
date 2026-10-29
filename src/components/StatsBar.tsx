import type { TextStats } from "@/lib/textStats";

export interface StatsBarProps {
  stats: TextStats;
  issueCount: number;
}

export function StatsBar({ stats, issueCount }: StatsBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface-muted px-3 py-1.5 text-xs text-foreground-muted">
      <span>
        <strong className="font-medium text-foreground">{stats.words}</strong> words
      </span>
      <span aria-hidden="true">·</span>
      <span>
        <strong className="font-medium text-foreground">{stats.characters}</strong> characters
      </span>
      <span aria-hidden="true">·</span>
      <span>~{stats.readingTimeMinutes} min read</span>
      <span aria-hidden="true">·</span>
      <span aria-live="polite">
        <strong className="font-medium text-foreground">{issueCount}</strong> issue
        {issueCount === 1 ? "" : "s"}
      </span>
    </div>
  );
}
