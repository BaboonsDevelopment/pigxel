"use client";

import { useRouter } from "next/navigation";

/** Picks which release the page shows, as ?v= in the address. */
export function VersionSelect({
  versions,
  value,
}: {
  versions: { version: string; label: string }[];
  value: string;
}) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Version</span>
      <select
        value={value}
        onChange={(e) => router.push(`/patch-notes?v=${e.target.value}`)}
        className="h-9 rounded-lg border bg-background px-3 text-sm font-medium"
      >
        {versions.map(({ version, label }) => (
          <option key={version} value={version}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
