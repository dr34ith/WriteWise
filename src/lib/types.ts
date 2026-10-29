export type Severity = "info" | "suggestion" | "warning" | "error";

export type Category =
  | "spelling"
  | "grammar"
  | "style"
  | "wordiness"
  | "tone"
  | "structure"
  | "evidence"
  | "typography"
  | "markdown"
  | "consistency"
  | "terminology";

export interface Span {
  start: number;
  end: number;
}

export type ProtectedKind =
  | "code-block"
  | "inline-code"
  | "url"
  | "email"
  | "ipv4"
  | "ipv6"
  | "mac"
  | "hash"
  | "cve"
  | "mitre"
  | "path"
  | "registry"
  | "flag"
  | "timestamp"
  | "frontmatter"
  | "liquid"
  | "md-link-target"
  | "event-id"
  | "custom";

export interface ProtectedRange extends Span {
  kind: ProtectedKind;
}

export interface Suggestion {
  label: string;
  replacement: string;
  span?: Span;
}

export interface Issue {
  id: string;
  ruleId: string;
  category: Category;
  severity: Severity;
  span: Span;
  message: string;
  why: string;
  suggestions: Suggestion[];
  example?: string;
  experimental?: boolean;
}

export type DocMode =
  | "ctf-writeup"
  | "walkthrough"
  | "incident-report"
  | "blog-post"
  | "academic";

export interface SpellCheckerLike {
  correct(word: string): boolean;
  suggest(word: string): string[];
}

export interface RuleContext {
  text: string;
  mode: DocMode;
  protectedRanges: ProtectedRange[];
  spellChecker?: SpellCheckerLike;
  userDictionary?: ReadonlySet<string>;
  glossaryTerms?: ReadonlySet<string>;
}

export interface Rule {
  id: string;
  category: Category;
  defaultSeverity: Severity;
  experimental?: boolean;
  appliesTo?: DocMode[];
  run(ctx: RuleContext): Issue[];
}

export interface SectionSpec {
  id: string;
  label: string;
  synonyms: string[];
  required: boolean;
}

export interface ChecklistItem {
  id: string;
  label: string;
  how: string;
}

export interface ScoreTargets {
  maxIssueDensityPer100Words: number;
  targetAvgSentenceLength: number;
  targetReadabilityGrade: number;
  maxPassivePercent: number;
}

export interface ToneProfile {
  severityOverrides: Partial<Record<string, Severity>>;
  maxSentenceWords: number;
  maxSentenceWordsError: number;
  maxParagraphWords: number;
}

export interface ModeConfig {
  id: DocMode;
  label: string;
  tone: ToneProfile;
  requiredSections: SectionSpec[];
  checklist: ChecklistItem[];
  template: string;
  scoreTargets: ScoreTargets;
}
