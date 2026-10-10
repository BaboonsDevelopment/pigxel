import type { TestProject } from "vitest/node";
import { localSupabase, type LocalSupabase } from "../support/local-supabase";

declare module "vitest" {
  export interface ProvidedContext {
    supabase: LocalSupabase;
  }
}

/** Finds local Supabase once, before any database test runs. */
export default function setup(project: TestProject) {
  project.provide("supabase", localSupabase());
}
