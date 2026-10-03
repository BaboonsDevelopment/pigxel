"use server";

import { requireUser } from "@/lib/auth/session";
import { search, type SearchResults } from "./server";

export async function searchAll(query: string): Promise<SearchResults> {
  const user = await requireUser();
  if (typeof query !== "string") return { tiles: [], artists: [] };
  return search(user.id, query);
}
