"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Editor, type EditorHandle } from "@/components/Editor";
import { EditorToolbar } from "@/components/EditorToolbar";
import { FixAllReview } from "@/components/FixAllReview";
import { HelpPopover } from "@/components/HelpPopover";
import { MoonIcon, SunIcon } from "@/components/icons";
import { IssuePanel } from "@/components/IssuePanel";
import { Logo } from "@/components/Logo";
import { RephrasePanel, type SelectedSentence } from "@/components/RephrasePanel";
import { StatsBar } from "@/components/StatsBar";
import { AnalyzerClient } from "@/lib/analyzerClient";
import { applyAutoFix, planAutoFix } from "@/lib/autofix";
import { debounce } from "@/lib/debounce";
import { computeTextStats } from "@/lib/textStats";
import {
  loadDraft,
  loadIgnoredIssueIds,
  loadSettings,
  loadTheme,
  loadUserDictionary,
  saveDraft,
  saveIgnoredIssueIds,
  saveSettings,
  saveTheme,
  type Settings,
  type Theme,
} from "@/lib/storage";
import type { Issue, Span } from "@/lib/types";

const SAMPLE_TEXT = `# Sample Incident Summary

I think the attacker maybe got in through a phishing email. We looked at a lot of stuff in the logs and basically it was really bad. The logs from 10/12 shows the server was accessed at 14:05 and then at 2:10 PM.
`;

const TABS = ["issues", "rephrase"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = { issues: "Issues", rephrase: "Rephrase" };

export default function Home() {
  const clientRef = useRef<AnalyzerClient | null>(null);
  const editorApiRef = useRef<EditorHandle | null>(null);
  const [text, setText] = useState("");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [status, setStatus] = useState<"idle" | "analyzing" | "ready" | "error">("idle");
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [ignoredIds, setIgnoredIds] = useState<string[]>(() => loadIgnoredIssueIds());
  const [jumpToSpan, setJumpToSpan] = useState<Span | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [theme, setTheme] = useState<Theme | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("issues");
  const [showFixAllReview, setShowFixAllReview] = useState(false);
  const [selectedSentence, setSelectedSentence] = useState<SelectedSentence | null>(null);

  useEffect(() => {
    Promise.resolve().then(() => {
      setText(loadDraft() || SAMPLE_TEXT);
      setHydrated(true);
      const stored = loadTheme();
      if (stored) setTheme(stored);
    });
  }, []);

  useEffect(() => {
    clientRef.current = new AnalyzerClient();
    return () => clientRef.current?.terminate();
  }, []);

  const runAnalysisRef = useRef<(value: string) => void>(() => {});

  useEffect(() => {
    runAnalysisRef.current = debounce((value: string) => {
      if (!clientRef.current) return;
      setStatus("analyzing");
      clientRef.current
        .analyze({
          text: value,
          mode: settings.mode,
          englishVariant: settings.englishVariant,
          userDictionary: loadUserDictionary(),
        })
        .then((result) => {
          setIssues(result.issues);
          setStatus("ready");
        })
        .catch(() => setStatus("error"));
    }, 400);
  }, [settings.mode, settings.englishVariant]);

  useEffect(() => {
    if (!hydrated) return;
    saveDraft(text);
    runAnalysisRef.current(text);
    // The Fix-All review list shows spans computed against the text *before* this edit — once
    // the text changes underneath it, those offsets are stale, so close it.
    Promise.resolve().then(() => setShowFixAllReview(false));
  }, [text, hydrated]);

  useEffect(() => {
    if (theme) document.documentElement.classList.remove(theme === "dark" ? "light" : "dark");
    if (theme) document.documentElement.classList.add(theme);
  }, [theme]);

  const visibleIssues = useMemo(
    () =>
      issues.filter(
        (i) => !ignoredIds.includes(i.id) && !settings.ignoredRuleIds.includes(i.ruleId),
      ),
    [issues, ignoredIds, settings.ignoredRuleIds],
  );

  const autoFixPlan = useMemo(() => planAutoFix(visibleIssues), [visibleIssues]);
  const textStats = useMemo(() => computeTextStats(text), [text]);

  const handleSelect = useCallback((issue: Issue) => {
    setJumpToSpan({ ...issue.span });
  }, []);

  const handleApply = useCallback((issue: Issue, replacement: string) => {
    // Clear issues immediately: every remaining issue's span is relative to the text before
    // this edit, so showing them (or letting another one be applied) before re-analysis
    // finishes would operate on stale offsets.
    setIssues([]);
    setText((prev) => prev.slice(0, issue.span.start) + replacement + prev.slice(issue.span.end));
  }, []);

  const handleIgnore = useCallback((issue: Issue) => {
    setIgnoredIds((prev) => {
      const next = [...prev, issue.id];
      saveIgnoredIssueIds(next);
      return next;
    });
  }, []);

  const handleFixAllConfirm = useCallback((issuesToApply: Issue[]) => {
    setShowFixAllReview(false);
    setIssues([]);
    setText((prev) => applyAutoFix(prev, issuesToApply).text);
  }, []);

  const handleRephraseAccept = useCallback((span: Span, newText: string) => {
    setIssues([]);
    setSelectedSentence(null);
    setText((prev) => prev.slice(0, span.start) + newText + prev.slice(span.end));
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const current =
        prev ??
        (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light");
      const next: Theme = current === "dark" ? "light" : "dark";
      saveTheme(next);
      return next;
    });
  }, []);

  const handleClear = useCallback(() => {
    setIssues([]);
    setText("");
  }, []);

  const handleTabKeyDown = useCallback((e: React.KeyboardEvent, tab: Tab) => {
    const idx = TABS.indexOf(tab);
    let nextIdx: number | null = null;
    if (e.key === "ArrowRight") nextIdx = (idx + 1) % TABS.length;
    else if (e.key === "ArrowLeft") nextIdx = (idx - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") nextIdx = 0;
    else if (e.key === "End") nextIdx = TABS.length - 1;
    if (nextIdx !== null) {
      e.preventDefault();
      setActiveTab(TABS[nextIdx]);
      document.getElementById(`tab-${TABS[nextIdx]}`)?.focus();
    }
  }, []);

  const activeTabIdx = TABS.indexOf(activeTab);

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-2">
        <div className="flex items-center gap-2">
          <Logo size={28} />
          <h1 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-foreground">
            WriteWise
          </h1>
        </div>
        <div className="flex items-center gap-3 text-sm text-foreground-muted">
          <label className="flex items-center gap-1">
            English:
            <select
              value={settings.englishVariant}
              onChange={(e) =>
                updateSettings({ englishVariant: e.target.value as Settings["englishVariant"] })
              }
              className="rounded-md border border-border bg-transparent px-1 py-0.5 text-foreground"
            >
              <option value="us">US</option>
              <option value="gb">UK</option>
            </select>
          </label>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle light/dark theme"
            className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-border transition-transform duration-150 hover:scale-105 hover:bg-surface-muted active:scale-95"
          >
            <span
              className={`inline-flex transition-transform duration-300 ${
                theme === "dark" ? "rotate-0" : "rotate-90"
              }`}
            >
              {theme === "dark" ? <MoonIcon /> : <SunIcon />}
            </span>
          </button>
          <HelpPopover />
          <span>
            Status: <span className="font-mono">{status}</span>
          </span>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:flex-row">
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <EditorToolbar
            text={text}
            onClear={handleClear}
            onUndo={() => editorApiRef.current?.undo()}
            onRedo={() => editorApiRef.current?.redo()}
          />
          <div className="min-h-0 flex-1">
            <Editor
              ref={editorApiRef}
              value={text}
              onChange={setText}
              issues={visibleIssues}
              jumpToSpan={jumpToSpan}
              onCursorSentenceChange={setSelectedSentence}
            />
          </div>
          <StatsBar stats={textStats} issueCount={visibleIssues.length} />
        </div>
        <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-md border border-border bg-surface sm:max-w-sm">
          <div
            role="tablist"
            aria-label="Panels"
            className="relative grid grid-cols-2 border-b border-border"
          >
            {TABS.map((tab) => (
              <button
                key={tab}
                role="tab"
                id={`tab-${tab}`}
                aria-selected={activeTab === tab}
                aria-controls={`panel-${tab}`}
                tabIndex={activeTab === tab ? 0 : -1}
                onClick={() => setActiveTab(tab)}
                onKeyDown={(e) => handleTabKeyDown(e, tab)}
                className={`px-3 py-2 text-sm transition-colors ${
                  activeTab === tab ? "font-medium text-foreground" : "text-foreground-muted"
                }`}
              >
                {TAB_LABEL[tab]}
              </button>
            ))}
            <span
              aria-hidden="true"
              className="absolute bottom-0 left-0 h-0.5 w-1/2 bg-primary transition-transform duration-200 ease-out"
              style={{ transform: `translateX(${activeTabIdx * 100}%)` }}
            />
          </div>
          <div
            role="tabpanel"
            id="panel-issues"
            aria-labelledby="tab-issues"
            hidden={activeTab !== "issues"}
            className="min-h-0 flex-1 overflow-auto"
          >
            <div key={activeTab === "issues" ? "issues-visible" : "issues-hidden"} className="animate-fade-in h-full">
              <IssuePanel
                issues={visibleIssues}
                onSelect={handleSelect}
                onApply={handleApply}
                onIgnore={handleIgnore}
                onFixAll={() => setShowFixAllReview(true)}
                fixAllCount={autoFixPlan.selected.length}
              />
            </div>
          </div>
          <div
            role="tabpanel"
            id="panel-rephrase"
            aria-labelledby="tab-rephrase"
            hidden={activeTab !== "rephrase"}
            className="min-h-0 flex-1 overflow-auto"
          >
            <div key={activeTab === "rephrase" ? "rephrase-visible" : "rephrase-hidden"} className="animate-fade-in h-full">
              <RephrasePanel selectedSentence={selectedSentence} onAccept={handleRephraseAccept} />
            </div>
          </div>
          {showFixAllReview && (
            <FixAllReview
              selected={autoFixPlan.selected}
              skippedCount={autoFixPlan.skipped.length}
              onConfirm={handleFixAllConfirm}
              onCancel={() => setShowFixAllReview(false)}
            />
          )}
        </div>
      </main>
    </div>
  );
}
