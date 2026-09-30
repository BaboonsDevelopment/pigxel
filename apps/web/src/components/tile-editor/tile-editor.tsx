"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { listDrafts, readDraft } from "@/lib/pigxel-file/draft";
import { parsePigxel } from "@/lib/pigxel-file/format";
import { editorUrl } from "@/lib/pigxel-file/open-tile";
import { useIsClient } from "@/lib/use-is-client";
import { Editor } from "./components/editor";
import { MissingTile } from "./components/missing-tile";
import type { EditorProps } from "./constants";

/**
 * The tile page for one of the drafts kept in this browser. It renders in the
 * browser only, where the drafts live.
 */
export function TileEditor(props: EditorProps) {
  if (!useIsClient()) return <div className="h-dvh bg-muted" />;
  // A new tile id means a different tile: start its editor from scratch.
  return <DraftLoader key={props.tileId ?? ""} {...props} />;
}

function DraftLoader(props: EditorProps) {
  const { userId, tileId } = props;
  const [restored] = useState(() => {
    if (!tileId) return { redirect: listDrafts(userId)[0]?.id ?? null };
    const draft = readDraft(userId, tileId);
    try {
      return draft
        ? { draft, image: parsePigxel(draft.file) }
        : { missing: true as const };
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
  return <Editor {...props} draft={restored.draft} image={restored.image} />;
}

function Redirect({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => router.replace(to), [router, to]);
  return <div className="h-dvh bg-muted" />;
}
