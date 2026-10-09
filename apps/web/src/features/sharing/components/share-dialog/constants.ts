import { pixelifySans } from "@/lib/fonts/pixelify";
import { ROLE_LABELS, SHARE_ROLES } from "../../sharing";

export const ROLE_OPTIONS = SHARE_ROLES.map((role) => ({
  value: role,
  label: ROLE_LABELS[role],
}));

export const SECTION_TITLE = `${pixelifySans.className} mb-2 text-sm`;

export const ROW = "flex h-12 items-center gap-3 rounded-lg px-2";

export const PILL =
  "h-7 shrink-0 rounded-full border-transparent px-3 text-xs bg-pastel-pink text-primary-soft-foreground hover:bg-primary-soft";
