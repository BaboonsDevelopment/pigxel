const compact = new Intl.NumberFormat("en", { notation: "compact" });

export function formatCount(count: number) {
  return compact.format(count).toLowerCase();
}

export function searchWords(query: string) {
  return query
    .toLowerCase()
    .split(/[^\p{L}\p{N}_]+/u)
    .filter(Boolean);
}

export function highlightParts(text: string, words: string[]) {
  const lower = text.toLowerCase();
  const hits = new Array<boolean>(text.length).fill(false);
  for (const word of words) {
    let at = lower.indexOf(word);
    while (at !== -1) {
      hits.fill(true, at, at + word.length);
      at = lower.indexOf(word, at + word.length);
    }
  }
  const parts: { text: string; hit: boolean }[] = [];
  for (let i = 0; i < text.length; i++) {
    const last = parts.at(-1);
    if (last && last.hit === hits[i]) last.text += text[i];
    else parts.push({ text: text[i]!, hit: hits[i]! });
  }
  return parts;
}
