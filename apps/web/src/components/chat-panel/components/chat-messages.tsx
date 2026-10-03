import type { Area } from "@/components/pixel-canvas/constants";
import type { ChatEntry, Placement } from "../constants";
import { buttonVariants } from "@pigxel/ui/components/button";
import { PixelImage } from "@/components/ui/pixel-image";

type Props = {
  messages: ChatEntry[];
  pending: boolean;
  error: string | null;
  onChoose: (index: number, placement: Placement) => void;
  onPress: (index: number) => void;
  onHover: (area: Area | null) => void;
};

export function ChatMessages({
  messages,
  pending,
  error,
  onChoose,
  onPress,
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
          {message.role === "user" && message.references && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {message.references.map((reference, r) => (
                // eslint-disable-next-line @next/next/no-img-element -- data URL, nothing to optimize
                <img
                  key={r}
                  src={reference}
                  alt={`Reference ${r + 1}`}
                  className="size-16 rounded-md object-cover"
                />
              ))}
            </div>
          )}
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
                  className={buttonVariants({
                    variant: "secondary",
                    size: "sm",
                    className: "justify-between gap-3 text-left",
                  })}
                >
                  {placement.label}
                  <span className="text-muted-foreground tabular-nums">
                    {placement.area.w}×{placement.area.h}
                  </span>
                </button>
              ))}
            </div>
          )}
          {message.button && (
            <button
              type="button"
              disabled={pending}
              onClick={() => onPress(i)}
              className={buttonVariants({
                size: "sm",
                className: "mt-2 w-full",
              })}
            >
              {message.button.label}
            </button>
          )}
          {message.image && (
            <PixelImage
              src={message.image}
              alt="Generated picture"
              className="mt-2 w-full rounded-md"
            />
          )}
        </li>
      ))}
      {pending && <li className="text-muted-foreground">Thinking…</li>}
      {error && <li className="text-destructive">{error}</li>}
    </ol>
  );
}
