import { createBrowserClient } from "@supabase/ssr";
import { LocalRepo } from "./local";
import type { Repo } from "./repo";
import { SupabaseRepo } from "./supabase";

import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "../env";

export { isSupabaseConfigured, missingSupabaseEnv } from "../env";

let repo: Repo | null = null;

/** Supabase quando as variáveis de ambiente existem; senão, modo local no navegador. */
export function getRepo(): Repo {
  if (!repo) {
    repo = isSupabaseConfigured ? new SupabaseRepo(createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)) : new LocalRepo();
  }
  return repo;
}

export type { Repo, Snapshot, SessionInfo } from "./repo";
export { newId } from "./repo";
