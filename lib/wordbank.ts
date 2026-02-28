import type { WordBankItem, WordBankItemRaw } from "./types";

let cache: WordBankItem[] | null = null;

export async function loadWordBank(): Promise<WordBankItem[]> {
  if (cache) return cache;
  const res = await fetch("/word_bank.json", { cache: "force-cache" });
  if (!res.ok) throw new Error("Failed to load word bank");
  const raw = (await res.json()) as WordBankItemRaw[];

  cache = raw.map((r) => ({
    word: r.text,
    syllable_count: r.syllables,
    phonemes: r.phonemes,
    positions: r.positions
  }));

  return cache;
}

export type WordBankFilter = {
  query?: string;
  phoneme?: string; // e.g., "AH"
  position?: "initial"|"medial"|"final";
  syllables?: number[];
};

export function filterWordBank(items: WordBankItem[], f: WordBankFilter) {
  return items.filter((w) => {
    if (f.query && !w.word.toLowerCase().includes(f.query.toLowerCase())) return false;

    if (f.phoneme) {
      const posList = w.positions?.[f.phoneme];
      if (!posList) return false;
      if (f.position && !posList.includes(f.position)) return false;
    } else {
      if (f.position) return false; // strict & predictable
    }

    if (f.syllables?.length && !f.syllables.includes(w.syllable_count)) return false;

    return true;
  });
}

export function uniquePhonemes(items: WordBankItem[]) {
  const s = new Set<string>();
  items.forEach(i => i.phonemes.forEach(p => s.add(p)));
  return Array.from(s).sort();
}

export function uniqueSyllables(items: WordBankItem[]) {
  const s = new Set<number>();
  items.forEach(i => s.add(i.syllable_count));
  return Array.from(s).sort((a,b)=>a-b);
}
