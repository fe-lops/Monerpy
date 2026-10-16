import "server-only";
import { ApiError, assertKeyAccepted, supabaseAdmin } from "./supabaseAdmin";

/**
 * Garante que a requisição vem de uma administradora logada.
 * O navegador envia o access token da sessão em `Authorization: Bearer <token>`.
 */
export async function requireAdmin(request: Request): Promise<{ userId: string; email: string | null }> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new ApiError(401, "Sessão ausente. Entre novamente.");

  const admin = supabaseAdmin();
  const { data, error } = await admin.auth.getUser(token);
  assertKeyAccepted(error); // chave do servidor recusada ≠ sessão expirada
  if (error || !data.user) {
    if (error) console.error("[auth] getUser", error.message);
    throw new ApiError(401, "Sessão expirada. Entre novamente.");
  }

  const { data: profile, error: profileError } = await admin.from("profiles").select("is_admin").eq("user_id", data.user.id).maybeSingle();
  assertKeyAccepted(profileError);
  if (!profile?.is_admin) throw new ApiError(403, "Apenas administradores podem fazer isso.");

  return { userId: data.user.id, email: data.user.email ?? null };
}
