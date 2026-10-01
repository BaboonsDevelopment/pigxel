"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import { Lead, SectionTitle } from "@pigxel/ui/components/typography";
import { listAiUsage } from "@/lib/ai/actions";
import { dollars, groupActions, type UsageAction } from "./helpers";

const COLUMNS = ["Step", "Model", "In", "Out", "Thinking", "Image", "Cost"];

/** What each of your AI actions cost, request by request. */
export function UsageDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [actions, setActions] = useState<UsageAction[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dialog.current?.showModal();
    listAiUsage()
      .then((rows) => setActions(groupActions(rows)))
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Couldn’t load AI usage."),
      );
  }, []);

  const total = actions?.reduce((sum, a) => sum + (a.cost ?? 0), 0) ?? 0;

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => {
        // A click on the dimmed backdrop closes it.
        if (e.target === dialog.current) dialog.current.close();
      }}
      aria-labelledby="usage-dialog-title"
      className="m-auto max-h-[min(40rem,calc(100dvh-2rem))] w-[min(44rem,calc(100vw-2rem))] flex-col rounded-xl border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/40 open:flex"
    >
      <div className="flex items-start justify-between gap-4 border-b p-5">
        <div>
          <SectionTitle id="usage-dialog-title">AI usage</SectionTitle>
          <Lead className="mt-1">
            What each action cost, at Gemini’s paid prices.
          </Lead>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Close"
          onClick={() => dialog.current?.close()}
          className="text-lg leading-none"
        >
          ×
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : !actions ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : actions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No AI requests yet.</p>
        ) : (
          <ul className="space-y-2">
            {actions.map((action) => (
              <li key={action.at} className="rounded-lg border">
                <details>
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2 text-sm">
                    <span className="font-medium">{action.kind}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(action.at).toLocaleString()} ·{" "}
                      {action.rows.length}{" "}
                      {action.rows.length === 1 ? "request" : "requests"}
                    </span>
                    <span className="ml-auto font-mono font-semibold tabular-nums">
                      {dollars(action.cost)}
                    </span>
                  </summary>
                  <table className="w-full border-t text-xs tabular-nums">
                    <thead className="text-muted-foreground">
                      <tr>
                        {COLUMNS.map((name, i) => (
                          <th
                            key={name}
                            className={`px-3 py-1.5 font-medium ${i < 2 ? "text-left" : "text-right"}`}
                          >
                            {name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {action.rows.map((row, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-1.5">{row.step}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">
                            {row.model}
                          </td>
                          <td className="px-3 py-1.5 text-right">
                            {row.inputTokens}
                          </td>
                          <td className="px-3 py-1.5 text-right">
                            {row.outputTokens}
                          </td>
                          <td className="px-3 py-1.5 text-right">
                            {row.thinkingTokens}
                          </td>
                          <td className="px-3 py-1.5 text-right">
                            {row.imageTokens}
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono">
                            {dollars(row.cost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              </li>
            ))}
          </ul>
        )}
      </div>
      {actions && actions.length > 0 && (
        <div className="flex items-center justify-between border-t px-5 py-3 text-sm">
          <span className="text-muted-foreground">
            All {actions.length} actions shown
          </span>
          <span className="font-mono font-semibold tabular-nums">
            {dollars(total)}
          </span>
        </div>
      )}
    </dialog>
  );
}
