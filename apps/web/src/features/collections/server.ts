import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { avatarUrlOf, type ProfileRow } from "@/features/profile/profile";
import type { Collection, CollectionCard, MyCollection } from "./collections";
import { COLLECTION_ARTS_MAX, COLLECTION_COVERS } from "./constants";

type ItemRow = {
  collection_id: string;
  tile_id: string;
  tile: { thumbnail: string | null };
};

async function publicItems(collectionIds: string[]) {
  if (!collectionIds.length) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collection_items")
    .select("collection_id, tile_id, tile:tiles!inner(thumbnail)")
    .in("collection_id", collectionIds)
    .eq("tile.visibility", "public")
    .order("added_at", { ascending: false });
  if (error) throw new Error(`Couldn’t load collections: ${error.message}`);
  return data as unknown as ItemRow[];
}

export async function listProfileCollections(
  profileId: string,
): Promise<CollectionCard[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collections")
    .select("id, name")
    .eq("user_id", profileId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Couldn’t load collections: ${error.message}`);
  const items = await publicItems(data.map((row) => row.id));
  return data.map((row) => {
    const own = items.filter((item) => item.collection_id === row.id);
    return {
      id: row.id,
      name: row.name,
      count: own.length,
      covers: own
        .flatMap((item) => (item.tile.thumbnail ? [item.tile.thumbnail] : []))
        .slice(0, COLLECTION_COVERS),
    };
  });
}

export async function listMyCollections(
  userId: string,
  tileId: string,
): Promise<MyCollection[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collections")
    .select("id, name, items:collection_items(tile_id)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Couldn’t load collections: ${error.message}`);
  return (
    data as unknown as {
      id: string;
      name: string;
      items: { tile_id: string }[];
    }[]
  ).map((row) => ({
    id: row.id,
    name: row.name,
    count: row.items.length,
    has: row.items.some((item) => item.tile_id === tileId),
  }));
}

type CollectionRow = {
  id: string;
  name: string;
  description: string;
  user_id: string;
  author: Pick<
    ProfileRow,
    | "username"
    | "display_name"
    | "avatar_kind"
    | "avatar_path"
    | "provider_avatar_url"
  >;
};

export async function getCollection(
  id: string,
): Promise<{ collection: Collection; tileIds: string[] } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collections")
    .select(
      "id, name, description, user_id, author:profiles!inner(username, display_name, avatar_kind, avatar_path, provider_avatar_url)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Couldn’t load this collection: ${error.message}`);
  if (!data) return null;
  const row = data as unknown as CollectionRow;
  const items = await publicItems([row.id]);
  return {
    collection: {
      id: row.id,
      name: row.name,
      description: row.description,
      author: {
        id: row.user_id,
        username: row.author.username,
        name: row.author.display_name,
        avatarUrl: avatarUrlOf(row.author),
      },
    },
    tileIds: items.slice(0, COLLECTION_ARTS_MAX).map((item) => item.tile_id),
  };
}
