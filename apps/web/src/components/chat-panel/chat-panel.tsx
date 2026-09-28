"use client";

import { useState } from "react";
import { generateImage, sendMessage } from "@/app/tiles/new/actions";
import type { Area } from "@/components/pixel-canvas/constants";
import type { ChatMessage } from "@/lib/ai/types";
import { ChatComposer } from "./components/chat-composer";
import { ChatHeader } from "./components/chat-header";
import { ChatMessages } from "./components/chat-messages";
import { ChatWelcome } from "./components/chat-welcome";
import type { CreateTarget } from "./constants";

type Props = {
  /** Resolves the tile area to generate into; null when the user cancels. */
  onPickArea: (target: CreateTarget) => Promise<Area | null>;
  /** Places a generated picture into that area of the canvas. */
  onImage: (dataUrl: string, area: Area) => Promise<void>;
};

export function ChatPanel({ onPickArea, onImage }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (text: string) => {
    const conversation: ChatMessage[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(conversation);
    setError(null);
    setPending(true);
    try {
      // Pictures stay on the client; the server only needs the text.
      const reply = await sendMessage(
        conversation.map(({ role, content }) => ({ role, content })),
      );
      setMessages([...conversation, reply]);
    } catch {
      setError("The assistant could not answer. Try again.");
    } finally {
      setPending(false);
    }
  };

  const create = async (index: number, target: CreateTarget) => {
    const subject = messages[index]?.create?.subject;
    if (!subject || pending) return;
    const area = await onPickArea(target);
    if (!area) return;

    setMessages((all) =>
      all.map((m, i) =>
        i === index ? { ...m, create: { subject, done: true } } : m,
      ),
    );
    setError(null);
    setPending(true);
    try {
      const image = await generateImage(subject, area.w, area.h);
      await onImage(image, area);
      setMessages((all) => [
        ...all,
        { role: "assistant", content: "Here is your picture.", image },
      ]);
    } catch {
      setError("The picture could not be generated. Try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <aside className="flex min-h-0 flex-col border-l bg-background">
      <ChatHeader />
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <ChatWelcome />
        ) : (
          <ChatMessages
            messages={messages}
            pending={pending}
            error={error}
            onCreate={create}
          />
        )}
      </div>
      <ChatComposer pending={pending} onSend={send} />
    </aside>
  );
}
