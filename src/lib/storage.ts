import type { DocMode } from "./types";
import type { EnglishVariant } from "./spelling";

const VERSION = "v1";

function key(name: string): string {
  return `ww:${VERSION}:${name}`;
}

function readJSON<T>(name: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key(name));
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(name: string, value: unknown): void {
  try {
    localStorage.setItem(key(name), JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode, quota, SSR) — fail silently.
  }
}

export interface Settings {
  englishVariant: EnglishVariant;
  mode: DocMode;
  ignoredRuleIds: string[];
}

const DEFAULT_SETTINGS: Settings = {
  englishVariant: "us",
  mode: "blog-post",
  ignoredRuleIds: [],
};

export function loadSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...readJSON<Partial<Settings>>("settings", {}) };
}

export function saveSettings(settings: Settings): void {
  writeJSON("settings", settings);
}

export function loadUserDictionary(): string[] {
  return readJSON<string[]>("dictionary", []);
}

export function saveUserDictionary(words: string[]): void {
  writeJSON("dictionary", [...new Set(words.map((w) => w.toLowerCase()))]);
}

export function loadIgnoredIssueIds(): string[] {
  return readJSON<string[]>("ignored", []);
}

export function saveIgnoredIssueIds(ids: string[]): void {
  writeJSON("ignored", [...new Set(ids)]);
}

export function loadDraft(): string {
  return readJSON<string>("draft", "");
}

export function saveDraft(text: string): void {
  writeJSON("draft", text);
}

export type Theme = "light" | "dark";

/** Returns null when the user hasn't explicitly chosen a theme yet (system preference applies). */
export function loadTheme(): Theme | null {
  return readJSON<Theme | null>("theme", null);
}

export function saveTheme(theme: Theme): void {
  writeJSON("theme", theme);
}
