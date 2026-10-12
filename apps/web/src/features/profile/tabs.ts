export const PROFILE_TABS = [
  { id: "published", label: "Published", title: "Published projects" },
  { id: "drafts", label: "Drafts", title: "Drafts", ownerOnly: true },
  { id: "liked", label: "Liked", title: "Liked arts" },
  { id: "saved", label: "Saved", title: "Saved arts", ownerOnly: true },
  { id: "followed", label: "Followed", title: "Followed artists" },
  { id: "collections", label: "Collections", title: "Collections" },
  { id: "followers", label: "Followers", title: "Followers", hidden: true },
] as const;

export type ProfileTabId = (typeof PROFILE_TABS)[number]["id"];

export function readTab(value: string | undefined, isOwner: boolean) {
  const tab = PROFILE_TABS.find((t) => t.id === value);
  return tab && (isOwner || !("ownerOnly" in tab)) ? tab : PROFILE_TABS[0];
}

export function tabHref(username: string, tab: string) {
  return tab === "published" ? `/u/${username}` : `/u/${username}?tab=${tab}`;
}
