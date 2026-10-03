"use client";

import { useRouter } from "next/navigation";
import { Select } from "@pigxel/ui/components/input";
import { Text } from "@pigxel/ui/components/typography";

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
      <Text as="span" tone="muted">
        Version
      </Text>
      <Select
        value={value}
        onChange={(e) => router.push(`/patch-notes?v=${e.target.value}`)}
        className="h-9 px-3 font-medium"
      >
        {versions.map(({ version, label }) => (
          <option key={version} value={version}>
            {label}
          </option>
        ))}
      </Select>
    </label>
  );
}
