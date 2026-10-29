export interface DictionaryFiles {
  aff: string;
  dic: string;
}

export interface SpellChecker {
  correct(word: string): boolean;
  suggest(word: string): string[];
  add(word: string): void;
}

export type EnglishVariant = "us" | "gb";

/** Builds an nspell instance from raw affix/dictionary file contents. Pure, no I/O. */
export async function buildSpellChecker(files: DictionaryFiles): Promise<SpellChecker> {
  const { default: nspell } = await import("nspell");
  return nspell({ aff: files.aff, dic: files.dic }) as unknown as SpellChecker;
}

const DICTIONARY_PATHS: Record<EnglishVariant, string> = {
  us: "/dictionaries/en",
  gb: "/dictionaries/en-gb",
};

/** Fetches the Hunspell dictionary files served from public/dictionaries (browser/worker only). */
export async function fetchDictionaryFiles(variant: EnglishVariant): Promise<DictionaryFiles> {
  const base = DICTIONARY_PATHS[variant];
  const [aff, dic] = await Promise.all([
    fetch(`${base}/index.aff`).then((r) => r.text()),
    fetch(`${base}/index.dic`).then((r) => r.text()),
  ]);
  return { aff, dic };
}

const cache = new Map<EnglishVariant, Promise<SpellChecker>>();

/** Loads (and caches) a spell checker for the given variant using the browser fetch path. */
export function loadSpellChecker(variant: EnglishVariant): Promise<SpellChecker> {
  let pending = cache.get(variant);
  if (!pending) {
    pending = fetchDictionaryFiles(variant).then(buildSpellChecker);
    cache.set(variant, pending);
  }
  return pending;
}
