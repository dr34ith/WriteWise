"use client";

import { useMemo, useState } from "react";
import { CheckIcon } from "@/components/icons";
import { applyEdits } from "@/lib/rephrase/applyEdits";
import { rephrase, type RephraseCandidate, type RephraseStyle } from "@/lib/rephrase/engine";
import type { Span } from "@/lib/types";

const STYLES: { id: RephraseStyle; label: string }[] = [
  { id: "concise", label: "Concise" },
  { id: "formal", label: "Formal / Report" },
  { id: "technical", label: "Technical" },
  { id: "plain", label: "Plain / Simple" },
  { id: "split", label: "Split long sentence" },
];

export interface SelectedSentence {
  text: string;
  span: Span;
}

export interface RephrasePanelProps {
  selectedSentence: SelectedSentence | null;
  onAccept: (span: Span, newText: string) => void;
}

export function RephrasePanel({ selectedSentence, onAccept }: RephrasePanelProps) {
  const [style, setStyle] = useState<RephraseStyle>("concise");
  const [checkedByCandidate, setCheckedByCandidate] = useState<Record<number, boolean[]>>({});

  const candidates: RephraseCandidate[] = useMemo(() => {
    if (!selectedSentence || selectedSentence.text.trim().length === 0) return [];
    return rephrase(selectedSentence.text, style);
  }, [selectedSentence, style]);

  if (!selectedSentence || selectedSentence.text.trim().length === 0) {
    return (
      <div className="p-4 text-sm text-foreground-muted">
        Click into a sentence in the editor, then pick a style to see rewrite suggestions.
      </div>
    );
  }

  const isChecked = (candidateIndex: number, changeIndex: number): boolean =>
    checkedByCandidate[candidateIndex]?.[changeIndex] ?? true;

  const toggleChange = (candidateIndex: number, changeIndex: number) => {
    setCheckedByCandidate((prev) => {
      const candidate = candidates[candidateIndex];
      const current = prev[candidateIndex] ?? candidate.changes.map(() => true);
      const next = [...current];
      next[changeIndex] = !next[changeIndex];
      return { ...prev, [candidateIndex]: next };
    });
  };

  const acceptCandidate = (candidateIndex: number) => {
    const candidate = candidates[candidateIndex];
    const checks = checkedByCandidate[candidateIndex] ?? candidate.changes.map(() => true);
    const checkedEdits = candidate.changes
      .filter((_, i) => checks[i])
      .map((c) => ({ span: c.span, replacement: c.after, reason: c.reason }));
    if (checkedEdits.length === 0) return;
    const { text } = applyEdits(selectedSentence.text, checkedEdits);
    onAccept(selectedSentence.span, text);
  };

  return (
    <div className="flex h-full flex-col overflow-auto">
      <div className="border-b border-border p-3">
        <p className="mb-2 text-xs text-foreground-muted">Selected sentence:</p>
        <p className="mb-3 text-sm italic text-foreground">
          &ldquo;{selectedSentence.text.trim()}&rdquo;
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Rephrase style">
          {STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStyle(s.id)}
              aria-pressed={style === s.id}
              className={`rounded-md border px-2 py-1 text-xs transition-colors transition-transform duration-150 hover:scale-105 active:scale-95 ${
                style === s.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-foreground-muted hover:bg-surface-muted hover:text-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 divide-y divide-border overflow-auto">
        {candidates.length === 0 && (
          <p className="p-4 text-sm text-foreground-muted">
            No {STYLES.find((s) => s.id === style)?.label.toLowerCase()} rewrite found for this
            sentence (or it reads as an unsupported claim that needs evidence, not a rewrite).
          </p>
        )}
        {candidates.map((candidate, ci) => (
          <div key={ci} className="animate-fade-in p-3">
            <p className="mb-2 text-sm text-foreground">{candidate.text}</p>
            <ul className="mb-2 space-y-1">
              {candidate.changes.map((change, chi) => (
                <li key={chi} className="flex items-start gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={isChecked(ci, chi)}
                    onChange={() => toggleChange(ci, chi)}
                    aria-label={`Apply change: ${change.before || "(nothing)"} to ${change.after || "(removed)"}`}
                    className="mt-0.5"
                  />
                  <span className="text-foreground-muted">
                    <span className="line-through">{change.before || "(nothing)"}</span>
                    {" -> "}
                    <span className="font-medium text-foreground">
                      {change.after || "(removed)"}
                    </span>
                    {" — "}
                    {change.reason}
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => acceptCandidate(ci)}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-xs text-foreground-muted transition-colors transition-transform duration-150 hover:scale-105 hover:bg-accent-mint hover:text-foreground active:scale-95"
            >
              <CheckIcon className="h-3.5 w-3.5" />
              Accept
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
