export const SHARE_ROLES = ["viewer", "editor"] as const;

export type ShareRole = (typeof SHARE_ROLES)[number];

export const LINK_ACCESS = ["off", "view", "edit"] as const;

export type LinkAccess = (typeof LINK_ACCESS)[number];

export const ROLE_LABELS: Record<ShareRole, string> = {
  viewer: "Viewer",
  editor: "Editor",
};

export const LINK_LABELS: Record<LinkAccess, string> = {
  off: "Off",
  view: "Can view",
  edit: "Can edit",
};

export type ProjectAccess = "owner" | ShareRole;

export type SharePerson = {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
  role: ShareRole;
  viaLink: boolean;
  pending: boolean;
};

export type PersonMatch = {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
};

export type ProjectSharing = {
  people: SharePerson[];
  link: { access: LinkAccess; token: string | null };
};

export type SharedProject = {
  id: string;
  name: string;
  width: number;
  height: number;
  thumbnail: string | null;
  updatedAt: string;
  role: ShareRole;
  owner: string | null;
};

export const SHARE_PATH = "/share";

export const shareLinkPath = (token: string) => `${SHARE_PATH}/${token}`;
