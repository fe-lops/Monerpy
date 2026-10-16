import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isKeyRejection } from "@/lib/supabaseKeys";
import { serverConfig, serviceKeyIssue } from "./config";

let client: SupabaseClient | null = null;

/**
 * Cliente com a chave service_role: ignora o RLS. Use APENAS em rotas do servidor,
 * depois de validar quem está chamando (ver requireAdmin).
 */
export function supabaseAdmin(): SupabaseClient {
  if (serviceKeyIssue) throw new ApiError(503, `Configuração do servidor: ${serviceKeyIssue} Corrija na Vercel e faça Redeploy.`);
  client ??= createClient(serverConfig.supabaseUrl, serverConfig.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/**
 * Se o Supabase recusou a CHAVE (e não a sessão da usuária), lança um erro explicando o que corrigir.
 * Chame logo após cada operação com o cliente admin.
 */
export function assertKeyAccepted(error: { message: string } | null | undefined): void {
  if (error && isKeyRejection(error.message))
    throw new ApiError(
      503,
      `Configuração do servidor: o Supabase recusou a SUPABASE_SERVICE_ROLE_KEY (“${error.message}”). Copie a chave service_role / Secret key deste projeto em Project Settings → API Keys, salve na Vercel e faça Redeploy.`,
    );
}

/** Tabela inexistente (migration não executada): 42P01 no Postgres, PGRST205 no PostgREST. */
export function isMissingTable(error: { code?: string } | null | undefined): boolean {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

/** Erro com status HTTP, convertido em resposta JSON pelas rotas. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
