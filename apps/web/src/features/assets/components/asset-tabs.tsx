import { TabLinks } from "@/components/ui/tab-links";
import { ASSET_CATEGORIES } from "../assets";

export const ASSET_TABS = [
  { value: "all", label: "All" },
  ...ASSET_CATEGORIES.map((c) => ({ value: c.id, label: c.label })),
  { value: "palettes", label: "Palettes" },
] as const;

export type AssetTab = (typeof ASSET_TABS)[number]["value"];

export function AssetTabs({ active }: { active: AssetTab }) {
  return (
    <TabLinks
      label="Kind of asset"
      variant="segmented"
      tabs={ASSET_TABS.map((tab) => ({
        href: tab.value === "all" ? "/assets" : `/assets?type=${tab.value}`,
        label: tab.label,
        active: tab.value === active,
      }))}
    />
  );
}
