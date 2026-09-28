"use client";

import { useState } from "react";
import { sendMessage } from "@/app/tiles/new/actions";
import type { ChatMessage } from "@/lib/ai/types";
import { ChatComposer } from "./components/chat-composer";
import { ChatHeader } from "./components/chat-header";
import { ChatMessages } from "./components/chat-messages";
import { ChatWelcome } from "./components/chat-welcome";

export function ChatPanel() {
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
      const reply = await sendMessage(conversation);
      setMessages([...conversation, { role: "assistant", content: reply }]);
    } catch {
      setError("The assistant could not answer. Try again.");
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
          <ChatMessages messages={messages} pending={pending} error={error} />
        )}
      </div>
      <ChatComposer pending={pending} onSend={send} />
    </aside>
  );
}
