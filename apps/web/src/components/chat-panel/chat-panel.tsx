"use client";

import { useState } from "react";
import {
  generateImage,
  sendMessage,
  suggestComposition,
} from "@/app/tiles/new/actions";
import type { Area } from "@/components/pixel-canvas/constants";
import { atLeastPlacementSize } from "@/components/pixel-canvas/helpers";
import { ChatComposer } from "./components/chat-composer";
import { ChatHeader } from "./components/chat-header";
import { ChatMessages } from "./components/chat-messages";
import { ChatWelcome } from "./components/chat-welcome";
import {
  UNREACHABLE,
  type CanvasBridge,
  type ChatEntry,
  type Placement,
} from "./constants";

export function ChatPanel({ canvas }: { canvas: CanvasBridge }) {
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [selectArea, setSelectArea] = useState(false);

  const append = (entry: ChatEntry) => setMessages((all) => [...all, entry]);

  const setPlacements = (index: number, placements?: Placement[]) =>
    setMessages((all) =>
      all.map((m, i) => (i === index ? { ...m, placements } : m)),
    );

  /** Generates `subject` for `area` and puts it on the canvas. */
  const draw = async (subject: string, area: Area, replace: boolean) => {
    setPending(true);
    const result = await generateImage(subject, area.w, area.h).catch(
      () => UNREACHABLE,
    );
    if (result.ok) {
      await canvas.place(result.value, area, replace);
      append({
        role: "assistant",
        content: "Here is your picture.",
        image: result.value,
      });
    } else {
      setError(result.error);
    }
    setPending(false);
    return result.ok;
  };

  /** The tile has art on it: offer to replace it, use free space, or blend in. */
  const offerPlacements = async (subject: string) => {
    setPending(true);
    const tile = canvas.fullArea();
    const placements: Placement[] = [
      { kind: "replace", label: "Replace everything", area: tile },
    ];
    const free = canvas.freeArea();
    if (free) {
      placements.push({
        kind: "free",
        label: "Put it in free space",
        area: free,
      });
    }
    const composed = await suggestComposition(
      subject,
      canvas.snapshot(),
      tile.w,
      tile.h,
    ).catch(() => UNREACHABLE);
    if (composed.ok) {
      placements.push({
        kind: "compose",
        label: "Blend into the scene",
        area: atLeastPlacementSize(composed.value, tile),
      });
    }
    setPending(false);
    append({
      role: "assistant",
      content: "There is already something on the tile. How should I add it?",
      create: { subject },
      placements,
    });
  };

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
    const subject = result.value.create?.subject;
    if (!subject) {
      append(result.value);
    } else if (selectArea) {
      const area = await canvas.selectArea();
      if (area) await draw(subject, area, false);
      else
        append({
          role: "assistant",
          content: "No area selected, so nothing was drawn.",
        });
    } else if (canvas.isEmpty()) {
      await draw(subject, canvas.fullArea(), true);
    } else {
      await offerPlacements(subject);
    }
  };

  const choose = async (index: number, placement: Placement) => {
    const entry = messages[index];
    const subject = entry?.create?.subject;
    if (!subject || pending) return;
    canvas.highlight(null);
    const replace = placement.kind === "replace";
    // Anything but a full replace can be moved and resized on the tile first.
    const area = replace
      ? placement.area
      : await canvas.adjustArea(placement.area);
    if (!area) return;
    setPlacements(index, undefined);
    setError(null);
    const drawn = await draw(subject, area, replace);
    // Bring the choice back so the user can simply try again.
    if (!drawn) setPlacements(index, entry.placements);
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
            onChoose={choose}
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
