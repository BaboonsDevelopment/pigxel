"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { sendMessage } from "../../actions";
import { toPictures } from "../../pictures";
import { MAX_HISTORY, REFERENCES_NOTE } from "../../constants";
import { notifyAiSpent } from "../../spent-event";
import { warnAboutTokens } from "../../token-warnings";
import { loadChat, saveChat } from "../../chat/history";
import { findPicture, forgetPictures, keepPicture } from "../../chat/pictures";
import { referencesForAction } from "../../chat/references";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { showLoading } from "@/components/ui/snackbar";
import { ChatComposer } from "./components/chat-composer";
import { ChatMessages } from "./components/chat-messages";
import { ChatWelcome } from "./components/chat-welcome";
import {
  ASK_FRAME,
  unreachable,
  type CanvasBridge,
  type Chat,
  type ChatEntry,
  type Placement,
} from "./constants";
import { animate } from "./flows/animate";
import { edit } from "./flows/edit";
import { drawOnNewLayer, generate } from "./flows/generate";

const SAVE_DELAY = 800;

class Stopped extends Error {}

const ignoreStop = (error: unknown) => {
  if (!(error instanceof Stopped)) throw error;
};

export function ChatPanel({
  canvas,
  tileId,
  autoFocus,
  startPrompt,
  onStarted,
}: {
  canvas: CanvasBridge;
  tileId: string;
  autoFocus?: boolean;
  /** Sent once, as soon as the chat is ready: the "Generate with AI" prompt. */
  startPrompt?: string | null;
  onStarted?: () => void;
}) {
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const wasPending = useRef(false);
  const loading = useRef<ReturnType<typeof showLoading> | null>(null);
  useEffect(() => {
    if (pending) loading.current ??= showLoading("Generating with AI…");
    else {
      loading.current?.close();
      loading.current = null;
    }
    if (!pending) notifyAiSpent();
    if (wasPending.current && !pending)
      void warnAboutTokens(() => router.push("/pricing"));
    wasPending.current = pending;
  }, [pending, router]);
  useEffect(() => () => loading.current?.close(), []);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [references, setReferences] = useState<string[]>([]);
  const [selectArea, setSelectArea] = useState(false);
  const kept = useRef(new Map<string, string>());
  const runs = useRef(0);
  const running = useRef(new Set<number>());
  const stopped = useRef(new Set<number>());

  useEffect(() => {
    let active = true;
    void (async () => {
      const saved = await loadChat(tileId).catch(() => null);
      if (!active) return;
      if (saved) {
        const restored = await Promise.all(
          saved.messages.map(
            async ({
              role,
              content,
              picture,
              layer,
              referencePictures,
              action,
              composition,
            }) => {
              const image = picture ? await findPicture(picture) : null;
              if (image && picture) kept.current.set(image, picture);
              const references = (
                await Promise.all(
                  (referencePictures ?? []).map(async (id) => {
                    const reference = await findPicture(id);
                    if (reference) kept.current.set(reference, id);
                    return reference;
                  }),
                )
              ).filter((reference): reference is string => !!reference);
              return {
                role,
                content,
                picture,
                layer,
                action,
                composition,
                references,
                image: image ?? undefined,
              };
            },
          ),
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
        messages.map(
          async ({
            role,
            content,
            image,
            picture,
            layer,
            references,
            action,
            composition,
          }) => {
            let id = picture ?? (image ? kept.current.get(image) : undefined);
            if (!id && image) {
              id = (await keepPicture(image)) ?? undefined;
              if (id) kept.current.set(image, id);
            }
            const referencePictures = (
              await Promise.all(
                (references ?? []).map(async (reference) => {
                  let key = kept.current.get(reference);
                  if (!key) {
                    key = (await keepPicture(reference)) ?? undefined;
                    if (key) kept.current.set(reference, key);
                  }
                  return key;
                }),
              )
            ).filter((key): key is string => !!key);
            return {
              role,
              content,
              action,
              composition,
              ...(id && { picture: id, layer }),
              ...(referencePictures.length && { referencePictures }),
            };
          },
        ),
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

  const chatWith = (
    history: ChatEntry[],
    references: string[] = [],
    token = ++runs.current,
  ): Chat => {
    const alive = () => !stopped.current.has(token);
    return {
      canvas: new Proxy(canvas, {
        get(target, key) {
          const value = Reflect.get(target, key) as unknown;
          if (typeof value !== "function") return value;
          return (...args: unknown[]) => {
            if (!alive()) throw new Stopped();
            return (value as (...a: unknown[]) => unknown).apply(target, args);
          };
        },
      }),
      messages: history,
      selectArea,
      references,
      append: (entry) => {
        if (alive()) append(entry);
      },
      say: (content) => {
        if (alive()) append({ role: "assistant", content });
      },
      setPending: (on) => {
        if (!alive()) return;
        if (on) running.current.add(token);
        else running.current.delete(token);
        setPending(on);
      },
      setError: (message) => {
        if (alive()) setError(message);
      },
    };
  };

  const clear = async () => {
    const confirmed = await confirmDialog({
      title: "Clear this chat?",
      message:
        "Every message and picture in the chat for this tile is deleted. The tile itself doesn’t change.",
      confirmLabel: "Clear chat",
    });
    if (!confirmed) return;
    const pictures = [
      ...new Set(
        messages.flatMap(({ picture, image, references }) => {
          const id = picture ?? (image ? kept.current.get(image) : undefined);
          return [
            ...(id ? [id] : []),
            ...(references ?? []).flatMap((reference) => {
              const key = kept.current.get(reference);
              return key ? [key] : [];
            }),
          ];
        }),
      ),
    ];
    kept.current.clear();
    setMessages([]);
    setError(null);
    void forgetPictures(pictures);
  };

  const stop = () => {
    for (const token of running.current) stopped.current.add(token);
    running.current.clear();
    setPending(false);
    append({
      role: "assistant",
      content: "Stopped. Nothing more will change from that request.",
    });
  };

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
    const token = ++runs.current;
    running.current.add(token);
    // Bound the request here too. Trimming only inside the server action still
    // sends the entire saved chat before Next can enforce its body limit.
    const recent = conversation.slice(-MAX_HISTORY);
    const visualContext = [...recent]
      .reverse()
      .find((message) => message.role === "user" && message.references?.length);
    const result = await sendMessage(
      recent.map((message) => ({
        role: message.role,
        content: message.references?.length
          ? `${message.content} ${REFERENCES_NOTE}`
          : message.content,
        ...(message === visualContext && {
          references: toPictures(message.references),
        }),
      })),
    ).catch(unreachable);
    if (stopped.current.has(token)) return;
    running.current.delete(token);
    setPending(false);

    if (!result.ok) {
      setMessages(messages);
      setDraft((current) => current || text);
      setReferences((current) => (current.length ? current : attached));
      setError(result.error);
      return;
    }
    const { action } = result.value;
    const routedConversation = action
      ? conversation.map((message, index) =>
          index === conversation.length - 1 ? { ...message, action } : message,
        )
      : conversation;
    if (action) change(conversation.length - 1, { action });
    const chat = chatWith(
      routedConversation,
      action ? referencesForAction(routedConversation, action) : attached,
      token,
    );
    try {
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
    } catch (error) {
      if (!(error instanceof Stopped)) {
        console.error("[ai] request failed:", error);
        chat.setError("Couldn’t finish this request. Try again.");
      }
    } finally {
      chat.setPending(false);
    }
  };

  const started = useRef(false);
  useEffect(() => {
    if (!loaded || !startPrompt || started.current) return;
    started.current = true;
    onStarted?.();
    void send(startPrompt);
    // Runs once, when the saved chat has loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

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
      action.composition,
      action.style,
    ).catch((error: unknown) => {
      ignoreStop(error);
      return false;
    });
    if (!drawn) change(index, { placements: entry.placements });
  };

  const press = async (index: number) => {
    const button = messages[index]?.button;
    if (!button || pending) return;
    change(index, { button: undefined });
    const done = await button.run().catch((error: unknown) => {
      ignoreStop(error);
      return false;
    });
    if (!done) change(index, { button });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {messages.length > 0 && (
        <div className="flex shrink-0 justify-end border-b px-3 py-1">
          <button
            type="button"
            disabled={pending}
            onClick={() => void clear()}
            title={
              pending
                ? "Stop the request first"
                : "Delete every message of this tile’s chat"
            }
            className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
          >
            Clear chat
          </button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && <ChatWelcome />}
        <ChatMessages
          messages={messages}
          pending={pending}
          error={error}
          onChoose={choose}
          onPress={press}
          onHover={canvas.highlight}
        />
      </div>
      <ChatComposer
        autoFocus={autoFocus}
        draft={draft}
        onDraft={setDraft}
        references={references}
        onReferences={setReferences}
        selectArea={selectArea}
        onSelectArea={setSelectArea}
        pending={pending || !loaded}
        onSend={send}
        onStop={pending ? stop : undefined}
      />
    </div>
  );
}
