"use client";

import { useEffect, useRef, useState } from "react";
import { ResizeHandle } from "@/components/resize-handle";
import { sendMessage } from "@/lib/ai/actions";
import { REFERENCES_NOTE } from "@/lib/ai/constants";
import { loadChat, saveChat } from "@/lib/chat/history";
import { findPicture, keepPicture } from "@/lib/chat/pictures";
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

/** How long the chat waits after a change before saving it. */
const SAVE_DELAY = 800;

/**
 * The AI chat. Each message is routed: talk is answered, and a request to
 * draw, change or animate the tile runs its flow (see flows/), which works
 * on the tile's layers and frames through `canvas`. The chat is kept in
 * Pigxel cloud under the tile's id (see lib/chat), so it is there again when
 * the tile is opened.
 */
export function ChatPanel({
  canvas,
  tileId,
}: {
  canvas: CanvasBridge;
  tileId: string;
}) {
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  // Nothing is saved before the stored chat is back, so it isn't overwritten.
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  // Pictures attached to the message being written, to draw from.
  const [references, setReferences] = useState<string[]>([]);
  const [selectArea, setSelectArea] = useState(false);
  const [width, setWidth] = useState(PANEL_WIDTH.initial);
  const [collapsed, setCollapsed] = useState(false);
  // Pictures already in the browser's cache, by data URL, to keep each once.
  const kept = useRef(new Map<string, string>());

  useEffect(() => {
    let active = true;
    void (async () => {
      const saved = await loadChat(tileId).catch(() => null);
      if (!active) return;
      if (saved) {
        const restored = await Promise.all(
          saved.messages.map(async ({ role, content, picture }) => {
            const image = picture ? await findPicture(picture) : null;
            if (image && picture) kept.current.set(image, picture);
            return { role, content, picture, image: image ?? undefined };
          }),
        );
        if (!active) return;
        setMessages(restored);
      }
      setLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, [tileId]);

  // Saves a moment after the chat changes. Steps waiting for a click
  // (buttons, placement choices) are not kept: they belong to this visit.
  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(async () => {
      const saved = await Promise.all(
        messages.map(async ({ role, content, image, picture }) => {
          let id = picture ?? (image ? kept.current.get(image) : undefined);
          if (!id && image) {
            id = (await keepPicture(image)) ?? undefined;
            if (id) kept.current.set(image, id);
          }
          return { role, content, ...(id && { picture: id }) };
        }),
      );
      await saveChat(tileId, { messages: saved }).catch(() => false);
    }, SAVE_DELAY);
    return () => clearTimeout(timer);
  }, [loaded, messages, tileId]);

  const append = (entry: ChatEntry) => setMessages((all) => [...all, entry]);
  const change = (index: number, patch: Partial<ChatEntry>) =>
    setMessages((all) =>
      all.map((m, i) => (i === index ? { ...m, ...patch } : m)),
    );

  const chatWith = (history: ChatEntry[], references: string[] = []): Chat => ({
    canvas,
    messages: history,
    selectArea,
    references,
    append,
    say: (content) => append({ role: "assistant", content }),
    setPending,
    setError,
  });

  const send = async (text: string) => {
    const attached = references;
    const conversation: ChatEntry[] = [
      ...messages,
      {
        role: "user",
        content: text,
        ...(attached.length && { references: attached }),
      },
    ];
    setMessages(conversation);
    setReferences([]);
    setError(null);
    setPending(true);
    // Pictures stay on the client; the router only hears that there are some.
    const result = await sendMessage(
      conversation.map(({ role, content, references }) => ({
        role,
        content: references?.length ? `${content} ${REFERENCES_NOTE}` : content,
      })),
    ).catch(() => UNREACHABLE);
    setPending(false);

    if (!result.ok) {
      // Unanswered: take the message back so resending is one Enter.
      setMessages(messages);
      setDraft((current) => current || text);
      setReferences((current) => (current.length ? current : attached));
      setError(result.error);
      return;
    }
    const { action } = result.value;
    const chat = chatWith(conversation, attached);
    if (!action) append(result.value);
    else if (action.kind === "generate") await generate(chat, action);
    else if (action.kind === "animate") await animate(chat, action);
    else if (action.kind === "undo")
      chat.say(
        canvas.undo()
          ? "Took back the last change. Ask again (or press Ctrl+Z) to go further back."
          : "There is nothing to take back.",
      );
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
      chatWith(messages, entry.references),
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
        references={references}
        onReferences={setReferences}
        selectArea={selectArea}
        onSelectArea={setSelectArea}
        pending={pending || !loaded}
        onSend={send}
      />
    </aside>
  );
}
