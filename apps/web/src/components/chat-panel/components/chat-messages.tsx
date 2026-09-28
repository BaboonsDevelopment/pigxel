import type { Area } from "@/components/pixel-canvas/constants";
import type { ChatEntry, Placement } from "../constants";

type Props = {
  messages: ChatEntry[];
  pending: boolean;
  error: string | null;
  onChoose: (index: number, placement: Placement) => void;
  /** Points out on the canvas where a placement would draw. */
  onHover: (area: Area | null) => void;
};

export function ChatMessages({
  messages,
  pending,
  error,
  onChoose,
  onHover,
}: Props) {
  return (
    <ol className="flex flex-col gap-3 text-sm leading-relaxed">
      {messages.map((message, i) => (
        <li
          key={i}
          className={
            message.role === "user"
              ? "max-w-[85%] self-end rounded-lg bg-primary px-3 py-2 whitespace-pre-wrap text-primary-foreground"
              : "max-w-[85%] self-start rounded-lg border bg-muted px-3 py-2 whitespace-pre-wrap"
          }
        >
          {message.content}
          {message.placements && (
            <div className="mt-2 flex flex-col gap-1.5">
              {message.placements.map((placement) => (
                <button
                  key={placement.kind}
                  type="button"
                  disabled={pending}
                  onClick={() => onChoose(i, placement)}
                  onMouseEnter={() => onHover(placement.area)}
                  onMouseLeave={() => onHover(null)}
                  onFocus={() => onHover(placement.area)}
                  onBlur={() => onHover(null)}
                  className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-1.5 text-left text-xs font-medium hover:bg-muted disabled:opacity-50"
                >
                  {placement.label}
                  <span className="text-muted-foreground tabular-nums">
                    {placement.area.w}×{placement.area.h}
                  </span>
                </button>
              ))}
            </div>
          )}
          {message.image && (
            // eslint-disable-next-line @next/next/no-img-element -- data URL, nothing to optimize
            <img
              src={message.image}
              alt="Generated picture"
              className="mt-2 w-full rounded-md [image-rendering:pixelated]"
            />
          )}
        </li>
      ))}
      {pending && <li className="text-muted-foreground">Thinking…</li>}
      {error && <li className="text-destructive">{error}</li>}
    </ol>
  );
}
