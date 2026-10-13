import { highlightParts } from "../helpers";

export function Highlighted({
  text,
  words,
}: {
  text: string;
  words: string[];
}) {
  if (!words.length) return text;
  return highlightParts(text, words).map((part, i) =>
    part.hit ? (
      <mark key={i} className="rounded-[3px] bg-pastel-pink text-inherit">
        {part.text}
      </mark>
    ) : (
      part.text
    ),
  );
}
