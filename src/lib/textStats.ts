export interface TextStats {
  words: number;
  characters: number;
  readingTimeMinutes: number;
}

const AVERAGE_WORDS_PER_MINUTE = 200;

export function computeTextStats(text: string): TextStats {
  const words = (text.trim().match(/\S+/g) ?? []).length;
  const characters = text.length;
  const readingTimeMinutes = words === 0 ? 0 : Math.max(1, Math.round(words / AVERAGE_WORDS_PER_MINUTE));
  return { words, characters, readingTimeMinutes };
}
