"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { listDrafts, readDraft } from "@/lib/pigxel-file/draft";
import { parsePigxel } from "@/lib/pigxel-file/format";
import { editorUrl } from "@/lib/pigxel-file/open-tile";
import { useDraftsLoaded } from "@/lib/pigxel-file/use-drafts";
import { Editor } from "./components/editor";
import { MissingTile } from "./components/missing-tile";
import { keptTile } from "./kept-tiles";
import type { EditorProps } from "./constants";

export function TileEditor(props: EditorProps) {
  if (!useDraftsLoaded(props.userId)) return <div className="h-dvh bg-muted" />;
  return <DraftLoader key={props.tileId ?? ""} {...props} />;
}

function DraftLoader(props: EditorProps) {
  const { userId, tileId } = props;
  const [restored] = useState(() => {
    if (!tileId) return { redirect: listDrafts(userId)[0]?.id ?? null };
    const draft = readDraft(userId, tileId);
    if (!draft) return { missing: true as const };
    const kept = keptTile(draft.id, draft.savedAt);
    if (kept) return { draft, image: kept.image, kept };
    try {
      return { draft, image: parsePigxel(draft.file), kept: null };
    } catch {
      return { missing: true as const };
    }
  });
  if ("redirect" in restored)
    return (
      <Redirect
        to={restored.redirect ? editorUrl(restored.redirect) : "/tiles/new"}
      />
    );
  if ("missing" in restored) return <MissingTile />;
  return (
    <Editor
      {...props}
      draft={restored.draft}
      image={restored.image}
      kept={restored.kept}
    />
  );
}

function Redirect({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => router.replace(to), [router, to]);
  return <div className="h-dvh bg-muted" />;
}
