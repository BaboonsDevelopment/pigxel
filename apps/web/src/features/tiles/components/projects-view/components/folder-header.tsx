"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import { Heading } from "@pigxel/ui/components/typography";
import type { Folder } from "../../../folders";
import { DeleteFolderDialog } from "./delete-folder-dialog";
import { FolderNameDialog } from "./folder-name-dialog";

export function FolderHeader({ folder }: { folder: Folder }) {
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <header className="mb-8">
      <Link
        href="/tiles"
        className="inline-flex items-center gap-1.5 text-xs text-link-accent transition-colors hover:text-lavender-foreground"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-3.5"
        >
          <path d="M13 8H3M7 4 3 8l4 4" />
        </svg>
        My projects
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <Heading as="h1" className="text-[2.5rem] leading-[1.1] font-semibold">
          {folder.name}
        </Heading>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setRenaming(true)}
          >
            Rename
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setDeleting(true)}
            className="text-destructive"
          >
            Delete folder
          </Button>
        </div>
      </div>
      {deleting && (
        <DeleteFolderDialog
          folder={folder}
          onDeleted={() => router.push("/tiles")}
          onClose={() => setDeleting(false)}
        />
      )}
      {renaming && (
        <FolderNameDialog folder={folder} onClose={() => setRenaming(false)} />
      )}
    </header>
  );
}
