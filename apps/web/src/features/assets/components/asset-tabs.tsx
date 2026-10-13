import { TabLinks } from "@/components/ui/tab-links";
import type { AssetBlock } from "../assets";

export const ALL_TAB = "all";
export const PALETTES_TAB = "palettes";

export function AssetTabs({
  blocks,
  active,
}: {
  blocks: AssetBlock[];
  active: string;
}) {
  const tabs = [
    { value: ALL_TAB, label: "All" },
    ...blocks.map((block) => ({ value: block.id, label: block.name })),
    { value: PALETTES_TAB, label: "Palettes" },
  ];
  return (
    <TabLinks
      label="Kind of asset"
      variant="segmented"
      tabs={tabs.map((tab) => ({
        href: tab.value === ALL_TAB ? "/assets" : `/assets?type=${tab.value}`,
        label: tab.label,
        active: tab.value === active,
      }))}
    />
  );
}
