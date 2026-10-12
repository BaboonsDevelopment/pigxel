"use client";

import { useState } from "react";
import { BANNER_BUTTON } from "../constants";

export function ShareProfileButton({
  username,
  name,
}: {
  username: string;
  name: string;
}) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = new URL(`/u/${username}`, window.location.origin).href;
    try {
      if (navigator.share && matchMedia("(pointer: coarse)").matches)
        await navigator.share({ title: `${name} on Pigxel`, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={() => void share()}
      aria-label={copied ? "Link copied" : `Share ${name}’s profile`}
      className={BANNER_BUTTON}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-3.5"
      >
        <path d="M8 10V2.5M5 5.5l3-3 3 3M3 9v3.5A1.5 1.5 0 0 0 4.5 14h7a1.5 1.5 0 0 0 1.5-1.5V9" />
      </svg>
      {copied ? "Link copied" : "Share"}
    </button>
  );
}
