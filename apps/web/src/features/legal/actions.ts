"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/routes";
import { LEGAL } from "./legal";
import { acceptedIn, recordAcceptance } from "./acceptance";

export type AcceptState = { error?: string };

export async function acceptLegal(
  next: string,
  _state: AcceptState,
  formData: FormData,
): Promise<AcceptState> {
  if (!acceptedIn(formData))
    return {
      error: `Confirm you’re at least ${LEGAL.minAge} and agree to the Terms of Service to continue.`,
    };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const error = await recordAcceptance(supabase, "gate");
  if (error) {
    console.error("Couldn’t record the acceptance:", error);
    return { error: "We couldn’t save that. Please try again." };
  }
  revalidatePath("/", "layout");
  redirect(safeNext(next));
}
