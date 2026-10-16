import { createBrowserClient } from "@supabase/ssr";
import { isGhostBrowser } from "../ghost";
import { demoDB, LocalRepo, memoryStore } from "./local";
import type { Repo } from "./repo";
import { SupabaseRepo } from "./supabase";

import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "../env";

export { isSupabaseConfigured, supabaseEnvProblems } from "../env";

let repo: Repo | null = null;

/**
 * Escolhe a fonte de dados:
 *  1. Visitante (/ghost-test-user): memória, com dados de exemplo — mesmo com Supabase configurado.
 *  2. Supabase, quando as variáveis de ambiente existem.
 *  3. Modo local (localStorage).
 */
export function getRepo(): Repo {
  if (!repo) {
    if (isGhostBrowser()) repo = new LocalRepo(memoryStore(() => demoDB("Visitante")), "ghost");
    else if (isSupabaseConfigured) repo = new SupabaseRepo(createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY));
    else repo = new LocalRepo();
  }
  return repo;
}

export type { Repo, Snapshot, SessionInfo } from "./repo";
export { newId } from "./repo";
