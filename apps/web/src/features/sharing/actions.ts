"use server";

import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  avatarUrlOf,
  PROFILE_COLUMNS,
  toArtistProfile,
  type ProfileRow,
} from "@/features/profile/profile";
import {
  LINK_ACCESS,
  SHARE_ROLES,
  type LinkAccess,
  type PersonMatch,
  type ProjectAccess,
  type ProjectSharing,
  type SharedProject,
  type ShareRole,
} from "./sharing";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Result = { error?: string };

const ERRORS: Record<string, string> = {
  no_user: "No one has that username. Check the spelling.",
  self: "That’s you. You already own this project.",
  blocked: "You can’t share with this person.",
  not_owner: "Only the owner can change sharing.",
};

function sharingError(message: string | undefined) {
  return (message && ERRORS[message]) ?? "Couldn’t change sharing. Try again.";
}

async function rpc(name: string, args: Record<string, string>) {
  await requireUser();
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc(name, args);
    return error ? { error: sharingError(error.message) } : {};
  } catch {
    return { error: "We couldn’t connect. Please try again." };
  }
}

type PersonRow = Pick<
  ProfileRow,
  | "username"
  | "display_name"
  | "avatar_kind"
  | "avatar_path"
  | "provider_avatar_url"
> & {
  user_id: string;
  role: ShareRole;
  via_link: boolean;
  pending: boolean;
};

export async function loadProjectSharing(
  tileId: string,
): Promise<ProjectSharing> {
  await requireUser();
  if (!UUID.test(tileId)) throw new Error("Invalid request.");
  const supabase = await createClient();
  const [people, link] = await Promise.all([
    supabase.rpc("tile_people", { tile: tileId }),
    supabase
      .from("tile_links")
      .select("access, token")
      .eq("tile_id", tileId)
      .maybeSingle(),
  ]);
  if (people.error) throw new Error(sharingError(people.error.message));
  if (link.error) throw new Error("Couldn’t load sharing. Try again.");
  return {
    people: (people.data as PersonRow[]).map((row) => ({
      id: row.user_id,
      username: row.username,
      name: row.display_name,
      avatarUrl: avatarUrlOf(row),
      role: row.role,
      viaLink: row.via_link,
      pending: row.pending,
    })),
    link: link.data
      ? { access: link.data.access as LinkAccess, token: link.data.token }
      : { access: "off", token: null },
  };
}

export async function inviteToProject(
  tileId: string,
  username: string,
  role: ShareRole,
): Promise<Result> {
  if (!UUID.test(tileId) || !SHARE_ROLES.includes(role))
    return { error: "Invalid request." };
  if (!username.trim()) return { error: "Type a username." };
  return rpc("share_tile", { tile: tileId, who: username, what: role });
}

export async function setMemberRole(
  tileId: string,
  memberId: string,
  role: ShareRole,
): Promise<Result> {
  if (!UUID.test(tileId) || !UUID.test(memberId) || !SHARE_ROLES.includes(role))
    return { error: "Invalid request." };
  return rpc("set_tile_member_role", {
    tile: tileId,
    member: memberId,
    what: role,
  });
}

export async function removeMember(
  tileId: string,
  memberId: string,
): Promise<Result> {
  if (!UUID.test(tileId) || !UUID.test(memberId))
    return { error: "Invalid request." };
  return rpc("remove_tile_member", { tile: tileId, member: memberId });
}

export async function setLinkAccess(
  tileId: string,
  access: LinkAccess,
): Promise<Result> {
  if (!UUID.test(tileId) || !LINK_ACCESS.includes(access))
    return { error: "Invalid request." };
  return rpc("set_tile_link_access", { tile: tileId, what: access });
}

export async function resetShareLink(tileId: string): Promise<Result> {
  if (!UUID.test(tileId)) return { error: "Invalid request." };
  return rpc("reset_tile_link", { tile: tileId });
}

export async function respondToInvite(
  tileId: string,
  accept: boolean,
): Promise<Result> {
  await requireUser();
  if (!UUID.test(tileId)) return { error: "Invalid request." };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("respond_to_share_invite", {
      tile: tileId,
      accept,
    });
    if (error) return { error: "Couldn’t answer the invitation. Try again." };
    if (!data) return { error: "This invitation was cancelled." };
  } catch {
    return { error: "We couldn’t connect. Please try again." };
  }
  return {};
}

type SharedRow = {
  role: ShareRole;
  tile: {
    id: string;
    name: string;
    width: number;
    height: number;
    thumbnail: string | null;
    updated_at: string;
    owner: { username: string } | null;
  };
};

export async function loadSharedProjects(): Promise<SharedProject[]> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tile_members")
    .select(
      "role, tile:tiles!inner(id, name, width, height, thumbnail, updated_at, owner:profiles!tiles_user_id_profiles_fkey(username))",
    )
    .eq("user_id", user.id)
    .not("accepted_at", "is", null)
    .is("tile.deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error("Couldn’t load shared projects. Try again.");
  return (data as unknown as SharedRow[]).map(({ role, tile }) => ({
    id: tile.id,
    name: tile.name,
    width: tile.width,
    height: tile.height,
    thumbnail: tile.thumbnail,
    updatedAt: tile.updated_at,
    role,
    owner: tile.owner?.username ?? null,
  }));
}

export async function leaveProject(tileId: string): Promise<Result> {
  await requireUser();
  if (!UUID.test(tileId)) return { error: "Invalid request." };
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("leave_tile", { tile: tileId });
    if (error) return { error: "Couldn’t leave the project. Try again." };
  } catch {
    return { error: "We couldn’t connect. Please try again." };
  }
  return {};
}

export async function stopSharing(tileId: string): Promise<Result> {
  if (!UUID.test(tileId)) return { error: "Invalid request." };
  return rpc("stop_sharing_tile", { tile: tileId });
}

const PEOPLE_SHOWN = 20;

export async function searchPeople(query: string): Promise<PersonMatch[]> {
  const user = await requireUser();
  const text = query
    .trim()
    .replace(/^@/, "")
    .replace(/[^\p{L}\p{N}_ .'-]/gu, "")
    .slice(0, 50);
  if (!text) return [];
  const pattern = `"%${text}%"`;
  const supabase = await createClient();
  const [people, blocked] = await Promise.all([
    supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .neq("id", user.id)
      .or(`username.ilike.${pattern},display_name.ilike.${pattern}`)
      .order("username")
      .limit(PEOPLE_SHOWN),
    supabase.from("blocks").select("blocked_id").eq("blocker_id", user.id),
  ]);
  if (people.error) throw new Error("Couldn’t search people. Try again.");
  const hidden = new Set((blocked.data ?? []).map((row) => row.blocked_id));
  const exact = text.toLowerCase();
  return (people.data as ProfileRow[])
    .filter((row) => !hidden.has(row.id))
    .map((row) => {
      const profile = toArtistProfile(row);
      return {
        id: profile.id,
        username: profile.username,
        name: profile.name,
        avatarUrl: profile.avatarUrl,
      };
    })
    .sort(
      (a, b) =>
        Number(b.username.startsWith(exact)) -
          Number(a.username.startsWith(exact)) ||
        a.username.length - b.username.length,
    );
}

export async function loadProjectAccess(
  tileId: string,
): Promise<ProjectAccess | null> {
  const user = await requireUser();
  if (!UUID.test(tileId)) return null;
  const supabase = await createClient();
  const [tile, member] = await Promise.all([
    supabase.from("tiles").select("user_id").eq("id", tileId).maybeSingle(),
    supabase
      .from("tile_members")
      .select("role")
      .eq("tile_id", tileId)
      .eq("user_id", user.id)
      .not("accepted_at", "is", null)
      .maybeSingle(),
  ]);
  if (tile.error || member.error)
    throw new Error("Couldn’t check access. Try again.");
  if (!tile.data) return null;
  if (tile.data.user_id === user.id) return "owner";
  return (member.data?.role as ShareRole | undefined) ?? null;
}

export async function claimEdit(
  tileId: string,
): Promise<{ holder: string | null } | null> {
  await requireUser();
  if (!UUID.test(tileId)) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("claim_tile_edit", {
      tile: tileId,
    });
    if (error) return null;
    const holder = (data as { username: string; display_name: string }[])[0];
    return {
      holder: holder ? holder.display_name || `@${holder.username}` : null,
    };
  } catch {
    return null;
  }
}

export async function releaseEdit(tileId: string): Promise<void> {
  await requireUser();
  if (!UUID.test(tileId)) return;
  try {
    const supabase = await createClient();
    await supabase.rpc("release_tile_edit", { tile: tileId });
  } catch {}
}
