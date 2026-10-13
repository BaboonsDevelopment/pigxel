"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { MyCollection } from "./collections";
import { COLLECTION_DESCRIPTION_MAX, COLLECTION_NAME_MAX } from "./constants";
import { listMyCollections } from "./server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Result = { error?: string };

function detailsError(name: string, description: string) {
  if (!name.trim()) return "Give the collection a name.";
  if (name.trim().length > COLLECTION_NAME_MAX)
    return `Keep the name under ${COLLECTION_NAME_MAX} characters.`;
  if (description.trim().length > COLLECTION_DESCRIPTION_MAX)
    return `Keep the description under ${COLLECTION_DESCRIPTION_MAX} characters.`;
  return null;
}

export async function loadMyCollections(
  tileId: string,
): Promise<MyCollection[] | null> {
  const user = await requireUser();
  if (!UUID.test(tileId)) return null;
  try {
    return await listMyCollections(user.id, tileId);
  } catch {
    return null;
  }
}

export async function createCollection(
  name: string,
): Promise<{ collection?: MyCollection; error?: string }> {
  await requireUser();
  const invalid = detailsError(name, "");
  if (invalid) return { error: invalid };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("collections")
      .insert({ name: name.trim() })
      .select("id, name")
      .single();
    if (error) return { error: "Couldn’t create the collection. Try again." };
    return {
      collection: { id: data.id, name: data.name, count: 0, has: false },
    };
  } catch {
    return { error: "We couldn’t connect. Please try again." };
  }
}

export async function setInCollection(
  collectionId: string,
  tileId: string,
  inside: boolean,
): Promise<Result> {
  await requireUser();
  if (!UUID.test(collectionId) || !UUID.test(tileId))
    return { error: "Invalid request." };
  try {
    const supabase = await createClient();
    const { error } = inside
      ? await supabase
          .from("collection_items")
          .upsert(
            { collection_id: collectionId, tile_id: tileId },
            { onConflict: "collection_id,tile_id", ignoreDuplicates: true },
          )
      : await supabase
          .from("collection_items")
          .delete()
          .eq("collection_id", collectionId)
          .eq("tile_id", tileId);
    if (error) return { error: "Couldn’t change that. Try again." };
  } catch {
    return { error: "We couldn’t connect. Please try again." };
  }
  return {};
}

export async function updateCollection(
  id: string,
  name: string,
  description: string,
): Promise<Result> {
  const user = await requireUser();
  if (!UUID.test(id)) return { error: "Invalid request." };
  const invalid = detailsError(name, description);
  if (invalid) return { error: invalid };
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("collections")
      .update({ name: name.trim(), description: description.trim() })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return { error: "Couldn’t save the collection. Try again." };
  } catch {
    return { error: "We couldn’t connect. Please try again." };
  }
  refresh();
  return {};
}

export async function deleteCollection(id: string): Promise<Result> {
  const user = await requireUser();
  if (!UUID.test(id)) return { error: "Invalid request." };
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("collections")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return { error: "Couldn’t delete the collection. Try again." };
  } catch {
    return { error: "We couldn’t connect. Please try again." };
  }
  return {};
}
