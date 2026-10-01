"use client";

import { useState } from "react";
import { ICONS } from "../icons";
import { UsageDialog } from "./usage-dialog/usage-dialog";

export function ChatHeader({ onCollapse }: { onCollapse: () => void }) {
  const [usage, setUsage] = useState(false);
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b px-4">
      <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
        Assistant
      </h2>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setUsage(true)}
          title="What the AI cost"
          className="rounded px-1.5 py-0.5 font-mono text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          $ Usage
        </button>
        <button
          type="button"
          onClick={onCollapse}
          title="Hide the assistant"
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {ICONS.collapse}
        </button>
      </div>
      {usage && <UsageDialog onClose={() => setUsage(false)} />}
    </header>
  );
}
