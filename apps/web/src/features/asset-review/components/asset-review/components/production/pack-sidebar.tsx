"use client";

import { useState } from "react";
import { Badge } from "@pigxel/ui/components/badge";
import { Button } from "@pigxel/ui/components/button";
import { Input } from "@pigxel/ui/components/input";
import { cn } from "@pigxel/ui/lib/utils";
import type { ProductionAsset, ProductionPack } from "../../../../types";
import { useProductionActions } from "../../../../use-asset-review";
import { errorText } from "../../helpers";

export function PackSidebar({
  packs,
  assets,
  current,
  search,
  onSearch,
  onPick,
}: {
  packs: ProductionPack[];
  assets: ProductionAsset[];
  current: string | null;
  search: string;
  onSearch: (search: string) => void;
  onPick: (id: string) => void;
}) {
  const counts = new Map<string, number>();
  for (const asset of assets)
    counts.set(asset.packId, (counts.get(asset.packId) ?? 0) + 1);
  // The same box finds packs here and assets in the grid.
  const query = search.trim().toLowerCase();
  const shown = query
    ? packs.filter((pack) =>
        [pack.name, pack.id, pack.description ?? ""].some((text) =>
          text.toLowerCase().includes(query),
        ),
      )
    : packs;

  return (
    <aside className="grid content-start gap-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
      <Input
        type="search"
        aria-label="Search packs and assets"
        placeholder="Search packs and assets"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        className="h-9 text-sm"
      />
      <NewPack onCreated={onPick} />
      <nav aria-label="Packs">
        {query && !shown.length && (
          <p className="px-3 py-2 text-sm text-muted-foreground">
            No packs match
          </p>
        )}
        <ul className="grid gap-0.5">
          {shown.map((pack) => (
            <li key={pack.id}>
              <button
                type="button"
                aria-current={pack.id === current ? "page" : undefined}
                onClick={() => onPick(pack.id)}
                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted aria-[current=page]:bg-pastel-pink aria-[current=page]:font-semibold"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-3 shrink-0 rounded-sm border",
                    !pack.background && "bg-checker",
                  )}
                  style={
                    pack.background
                      ? { background: pack.background }
                      : undefined
                  }
                />
                <span className="min-w-0 flex-1 truncate">{pack.name}</span>
                {pack.pinned && <Badge tone="accent">Pinned</Badge>}
                {pack.premium && <Badge tone="primary">Premium</Badge>}
                <span className="font-mono text-[11px] text-muted-foreground">
                  {counts.get(pack.id) ?? 0}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

function NewPack({ onCreated }: { onCreated: (id: string) => void }) {
  const { createPack } = useProductionActions();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  if (!open)
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        + New pack
      </Button>
    );

  const submit = async () => {
    setPending(true);
    setError("");
    try {
      const pack = await createPack(name, "");
      setName("");
      setOpen(false);
      onCreated(pack.id);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="grid gap-2 rounded-xl border p-3"
    >
      <Input
        autoFocus
        required
        aria-label="New pack name"
        placeholder="Pack name"
        maxLength={40}
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-9 text-sm"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setOpen(false);
            setError("");
          }}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Adding…" : "Add pack"}
        </Button>
      </div>
    </form>
  );
}
