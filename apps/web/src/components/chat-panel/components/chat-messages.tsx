import type { ChatMessage } from "@/lib/ai/types";

type Props = {
  messages: ChatMessage[];
  pending: boolean;
  error: string | null;
};

export function ChatMessages({ messages, pending, error }: Props) {
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
