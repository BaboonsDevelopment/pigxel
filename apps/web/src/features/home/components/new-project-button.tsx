"use client";

import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";

const NewProjectDialog = dynamic(
  () =>
    import("@/features/editor/components/new-project-dialog").then(
      (m) => m.NewProjectDialog,
    ),
  { ssr: false },
);

const NewTilemapDialog = dynamic(
  () =>
    import("@/features/editor/components/new-tilemap-dialog").then(
      (m) => m.NewTilemapDialog,
    ),
  { ssr: false },
);

const UpgradeDialog = dynamic(
  () =>
    import("@/features/billing/components/upgrade-dialog").then(
      (m) => m.UpgradeDialog,
    ),
  { ssr: false },
);

/** Which start modal a button opens. */
export type ProjectKind = "blank" | "ai" | "tilemap";

/**
 * A button that opens a start modal: Create New Project, its Generate with
 * AI version, or New Tilemap. Without AI on their plan, "ai" opens the
 * upgrade modal instead.
 */
export function NewProjectButton({
  userId,
  kind = "blank",
  aiAllowed,
  folder,
  className,
  children,
}: {
  userId: string;
  kind?: ProjectKind;
  /** Whether the plan includes AI; unknown makes the modal check. */
  aiAllowed?: boolean;
  /** The folder a new project goes into. */
  folder?: { id: string; name: string };
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const modal =
    kind === "tilemap" ? (
      <NewTilemapDialog userId={userId} onClose={close} />
    ) : kind === "ai" && aiAllowed === false ? (
      <UpgradeDialog
        title="Generate with AI"
        description="Upgrade your plan to turn your ideas into pixel art with the AI helper."
        onClose={close}
      />
    ) : (
      <NewProjectDialog
        userId={userId}
        ai={kind === "ai"}
        aiAllowed={aiAllowed}
        folder={folder}
        onClose={close}
      />
    );
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      {open && modal}
    </>
  );
}
