"use client";

import { useEffect, useRef, useState } from "react";
import { sendMessage } from "@/lib/ai/actions";
import { REFERENCES_NOTE } from "@/lib/ai/constants";
import { notifyAiSpent } from "@/lib/ai/spent-event";
import { loadChat, saveChat } from "@/lib/chat/history";
import { findPicture, keepPicture } from "@/lib/chat/pictures";
import { ChatComposer } from "./components/chat-composer";
import { ChatMessages } from "./components/chat-messages";
import { ChatWelcome } from "./components/chat-welcome";
import {
  ASK_FRAME,
  UNREACHABLE,
  type CanvasBridge,
  type Chat,
  type ChatEntry,
  type Placement,
} from "./constants";
import { animate } from "./flows/animate";
import { edit } from "./flows/edit";
import { drawOnNewLayer, generate } from "./flows/generate";

const SAVE_DELAY = 800;

export function ChatPanel({
  canvas,
  tileId,
}: {
  canvas: CanvasBridge;
  tileId: string;
}) {
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (!pending) notifyAiSpent();
  }, [pending]);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [references, setReferences] = useState<string[]>([]);
  const [selectArea, setSelectArea] = useState(false);
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
    const result = await sendMessage(
      conversation.map(({ role, content, references }) => ({
        role,
        content: references?.length ? `${content} ${REFERENCES_NOTE}` : content,
      })),
    ).catch(() => UNREACHABLE);
    setPending(false);

    if (!result.ok) {
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

  const choose = async (index: number, placement: Placement) => {
    const entry = messages[index];
    const action = entry?.action;
    if (!action || pending) return;
    canvas.highlight(null);
    const replace = placement.kind === "replace";
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
    if (!drawn) change(index, { placements: entry.placements });
  };

  const press = async (index: number) => {
    const button = messages[index]?.button;
    if (!button || pending) return;
    change(index, { button: undefined });
    if (!(await button.run())) change(index, { button });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
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
    </div>
  );
}
