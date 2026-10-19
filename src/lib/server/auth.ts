import "server-only";
import { ApiError, assertKeyAccepted, supabaseAdmin } from "./supabaseAdmin";

/**
 * Garante que a requisição vem de uma usuária logada.
 * O navegador envia o access token da sessão em `Authorization: Bearer <token>`.
 */
export async function requireUser(request: Request): Promise<{ userId: string; email: string | null }> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new ApiError(401, "Sessão ausente. Entre novamente.");

  const { data, error } = await supabaseAdmin().auth.getUser(token);
  assertKeyAccepted(error); // chave do servidor recusada ≠ sessão expirada
  if (error || !data.user) {
    if (error) console.error("[auth] getUser", error.message);
    throw new ApiError(401, "Sessão expirada. Entre novamente.");
  }
  return { userId: data.user.id, email: data.user.email ?? null };
}

/** Como requireUser, mas só para administradoras (profiles.is_admin). */
export async function requireAdmin(request: Request): Promise<{ userId: string; email: string | null }> {
  const user = await requireUser(request);
  const { data: profile, error } = await supabaseAdmin().from("profiles").select("is_admin").eq("user_id", user.userId).maybeSingle();
  assertKeyAccepted(error);
  if (!profile?.is_admin) throw new ApiError(403, "Apenas administradores podem fazer isso.");
  return user;
}
