"use client";

import { useEffect, useRef } from "react";

/** Runner output that follows new lines unless scrolled up to read. */
export function RunLog({ text, label }: { text: string; label: string }) {
  const ref = useRef<HTMLPreElement>(null);
  const following = useRef(true);

  useEffect(() => {
    const pre = ref.current;
    if (pre && following.current) pre.scrollTop = pre.scrollHeight;
  }, [text]);

  return (
    <pre
      ref={ref}
      aria-label={label}
      tabIndex={0}
      onScroll={(e) => {
        const pre = e.currentTarget;
        following.current =
          pre.scrollHeight - pre.scrollTop - pre.clientHeight < 24;
      }}
      className="max-h-96 overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap"
    >
      {text || "Waiting for output…"}
    </pre>
  );
}
