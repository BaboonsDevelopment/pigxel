import { SUGGESTIONS } from "../constants";

export function ChatWelcome() {
  return (
    <div className="text-sm leading-relaxed">
      <p>Describe the change you want.</p>
      <ul className="mt-3 flex flex-col gap-2">
        {SUGGESTIONS.map((text) => (
          <li
            key={text}
            className="rounded-lg border bg-muted px-3 py-2 text-muted-foreground"
          >
            “{text}”
          </li>
        ))}
      </ul>
    </div>
  );
}
