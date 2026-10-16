import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isAdminApiConfigured, serverConfig } from "./config";

let client: SupabaseClient | null = null;

/**
 * Cliente com a chave service_role: ignora o RLS. Use APENAS em rotas do servidor,
 * depois de validar quem está chamando (ver requireAdmin).
 */
export function supabaseAdmin(): SupabaseClient {
  if (!isAdminApiConfigured) throw new ApiError(503, "Registro de contas indisponível no momento: o servidor não tem SUPABASE_SERVICE_ROLE_KEY configurada.");
  client ??= createClient(serverConfig.supabaseUrl, serverConfig.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
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
