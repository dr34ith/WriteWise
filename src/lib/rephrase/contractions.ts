/** Shared between formal.ts (which expands contractions) and guards.ts (which must normalize
 * both sides of a comparison the same way before counting negation/modal words — otherwise
 * expanding "won't" -> "will not" looks like it invented a "will" out of nowhere). */
export const CONTRACTIONS: Record<string, string> = {
  "don't": "do not",
  "doesn't": "does not",
  "didn't": "did not",
  "can't": "cannot",
  "couldn't": "could not",
  "won't": "will not",
  "wouldn't": "would not",
  "shouldn't": "should not",
  "isn't": "is not",
  "aren't": "are not",
  "wasn't": "was not",
  "weren't": "were not",
  "it's": "it is",
  "that's": "that is",
  "there's": "there is",
  "i'm": "I am",
  "we're": "we are",
  "they're": "they are",
  "i've": "I have",
  "we've": "we have",
  "they've": "they have",
};

const CONTRACTION_REGEX = new RegExp(`\\b(${Object.keys(CONTRACTIONS).join("|")})\\b`, "gi");

/** Expands every known contraction in `text` to its canonical form. */
export function normalizeContractions(text: string): string {
  return text.replace(CONTRACTION_REGEX, (match) => CONTRACTIONS[match.toLowerCase()]);
}
