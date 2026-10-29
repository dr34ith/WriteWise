"use client";

import { redo as cmRedo, undo as cmUndo } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { EditorState, StateEffect, StateField } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { findProtectedRanges } from "@/lib/protect";
import { segmentSentences } from "@/lib/segment";
import type { Issue, Span } from "@/lib/types";

const setIssues = StateEffect.define<Issue[]>();

const severityClass: Record<Issue["severity"], string> = {
  info: "ww-issue-info",
  suggestion: "ww-issue-suggestion",
  warning: "ww-issue-warning",
  error: "ww-issue-error",
};

const issuesField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setIssues)) {
        const docLength = tr.state.doc.length;
        const marks = effect.value
          .filter((issue) => issue.span.start < issue.span.end && issue.span.end <= docLength)
          .map((issue) =>
            Decoration.mark({ class: severityClass[issue.severity] }).range(
              issue.span.start,
              issue.span.end,
            ),
          );
        return Decoration.set(marks, true);
      }
    }
    return decorations.map(tr.changes);
  },
  provide: (field) => EditorView.decorations.from(field),
});

export interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  issues: Issue[];
  jumpToSpan?: { start: number; end: number } | null;
  onCursorSentenceChange?: (sentence: { text: string; span: Span } | null) => void;
}

export interface EditorHandle {
  undo: () => void;
  redo: () => void;
}

export const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  { value, onChange, issues, jumpToSpan, onCursorSentenceChange },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onCursorSentenceChangeRef = useRef(onCursorSentenceChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onCursorSentenceChangeRef.current = onCursorSentenceChange;
  }, [onCursorSentenceChange]);

  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        markdown(),
        issuesField,
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
          if ((update.docChanged || update.selectionSet) && onCursorSentenceChangeRef.current) {
            const fullText = update.state.doc.toString();
            const selection = update.state.selection.main;
            const protectedRanges = findProtectedRanges(fullText);
            const sentences = segmentSentences(fullText, protectedRanges);
            const match = !selection.empty
              ? sentences.find((s) => s.start <= selection.from && s.end >= selection.to)
              : sentences.find((s) => s.start <= selection.head && selection.head <= s.end);
            onCursorSentenceChangeRef.current(
              match ? { text: match.text, span: { start: match.start, end: match.end } } : null,
            );
          }
        }),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Only created once; `value` updates are pushed via the effect below to avoid
    // destroying/recreating the editor (and losing cursor position) on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
    }
  }, [value]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({ effects: setIssues.of(issues) });
  }, [issues]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || !jumpToSpan) return;
    view.dispatch({
      selection: { anchor: jumpToSpan.start, head: jumpToSpan.end },
      effects: EditorView.scrollIntoView(jumpToSpan.start, { y: "center" }),
    });
    view.focus();
  }, [jumpToSpan]);

  useImperativeHandle(
    ref,
    () => ({
      undo: () => {
        if (viewRef.current) cmUndo(viewRef.current);
      },
      redo: () => {
        if (viewRef.current) cmRedo(viewRef.current);
      },
    }),
    [],
  );

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-auto rounded-md border border-border bg-surface text-sm [&_.cm-editor]:h-full [&_.cm-scroller]:font-mono"
    />
  );
});
