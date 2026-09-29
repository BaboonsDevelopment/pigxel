"use client";

import { useState } from "react";
import { ResizeHandle } from "@/components/resize-handle";
import { sendMessage } from "@/lib/ai/actions";
import { ChatComposer } from "./components/chat-composer";
import { ChatHeader } from "./components/chat-header";
import { ChatMessages } from "./components/chat-messages";
import { ChatWelcome } from "./components/chat-welcome";
import {
  ASK_FRAME,
  PANEL_WIDTH,
  UNREACHABLE,
  type CanvasBridge,
  type Chat,
  type ChatEntry,
  type Placement,
} from "./constants";
import { animate } from "./flows/animate";
import { edit } from "./flows/edit";
import { drawOnNewLayer, generate } from "./flows/generate";
import { ICONS } from "./icons";

/**
 * The AI chat. Each message is routed: talk is answered, and a request to
 * draw, change or animate the tile runs its flow (see flows/), which works
 * on the tile's layers and frames through `canvas`.
 */
export function ChatPanel({ canvas }: { canvas: CanvasBridge }) {
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [selectArea, setSelectArea] = useState(false);
  const [width, setWidth] = useState(PANEL_WIDTH.initial);
  const [collapsed, setCollapsed] = useState(false);

  const append = (entry: ChatEntry) => setMessages((all) => [...all, entry]);
  const change = (index: number, patch: Partial<ChatEntry>) =>
    setMessages((all) =>
      all.map((m, i) => (i === index ? { ...m, ...patch } : m)),
    );

  const chatWith = (history: ChatEntry[]): Chat => ({
    canvas,
    messages: history,
    selectArea,
    append,
    say: (content) => append({ role: "assistant", content }),
    setPending,
    setError,
  });

  const send = async (text: string) => {
    const conversation: ChatEntry[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(conversation);
    setError(null);
    setPending(true);
    // Pictures stay on the client; the server only needs the text.
    const result = await sendMessage(
      conversation.map(({ role, content }) => ({ role, content })),
    ).catch(() => UNREACHABLE);
    setPending(false);

    if (!result.ok) {
      // Unanswered: take the message back so resending is one Enter.
      setMessages(messages);
      setDraft((current) => current || text);
      setError(result.error);
      return;
    }
    const { action } = result.value;
    const chat = chatWith(conversation);
    if (!action) append(result.value);
    else if (action.kind === "generate") await generate(chat, action);
    else if (action.kind === "animate") await animate(chat, action);
    else await edit(chat, action);
  };

  /** Draws the picture of message `index` where the chosen placement says. */
  const choose = async (index: number, placement: Placement) => {
    const entry = messages[index];
    const action = entry?.action;
    if (!action || pending) return;
    canvas.highlight(null);
    const replace = placement.kind === "replace";
    // Anything but a replacement can be moved and resized on the tile first.
    if (!replace) append({ role: "assistant", content: ASK_FRAME });
    const area = replace
      ? placement.area
      : await canvas.adjustArea(placement.area);
    if (!area) return;
    change(index, { placements: undefined });
    setError(null);
    const drawn = await drawOnNewLayer(
      chatWith(messages),
      action.request,
      action.name || "Picture",
      [area],
      replace,
    );
    // Bring the choice back so the user can simply try again.
    if (!drawn) change(index, { placements: entry.placements });
  };

  /** Runs the step a message waits for; its button comes back if it fails. */
  const press = async (index: number) => {
    const button = messages[index]?.button;
    if (!button || pending) return;
    change(index, { button: undefined });
    if (!(await button.run())) change(index, { button });
  };

  // Folded into a small tab at the top right, over the workspace.
  if (collapsed)
    return (
      <aside className="relative w-0">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          title="Show the assistant"
          className="absolute top-0 right-0 z-10 flex items-center gap-2 rounded-bl-md border-b border-l bg-background px-3 py-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase shadow-sm hover:text-foreground"
        >
          {ICONS.expand}
          Assistant
        </button>
      </aside>
    );

  return (
    <aside
      style={{ width }}
      className="relative flex min-h-0 flex-col border-l bg-background"
    >
      <ResizeHandle
        edge="left"
        size={width}
        min={PANEL_WIDTH.min}
        max={PANEL_WIDTH.max}
        onResize={setWidth}
      />
      <ChatHeader onCollapse={() => setCollapsed(true)} />
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <ChatWelcome />
        ) : (
          <ChatMessages
            messages={messages}
            pending={pending}
            error={error}
            onChoose={choose}
            onPress={press}
            onHover={canvas.highlight}
          />
        )}
      </div>
      <ChatComposer
        draft={draft}
        onDraft={setDraft}
        selectArea={selectArea}
        onSelectArea={setSelectArea}
        pending={pending}
        onSend={send}
      />
    </aside>
  );
}
