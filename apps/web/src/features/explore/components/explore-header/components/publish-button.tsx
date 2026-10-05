"use client";

import Link from "next/link";
import { useState } from "react";
import { buttonVariants } from "@pigxel/ui/components/button";
import { PublishDialog } from "./publish-dialog";

const className = buttonVariants({ className: "h-10 px-5" });

const icon = (
  <svg
    aria-hidden="true"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    className="size-4"
  >
    <path d="M8 3v10M3 8h10" />
  </svg>
);

export function PublishButton({ guest }: { guest: boolean }) {
  const [open, setOpen] = useState(false);
  if (guest)
    return (
      <Link href="/login" className={className}>
        Publish
        {icon}
      </Link>
    );
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        Publish
        {icon}
      </button>
      {open && <PublishDialog onClose={() => setOpen(false)} />}
    </>
  );
}
