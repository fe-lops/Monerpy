import "server-only";
import { ApiError, supabaseAdmin } from "./supabaseAdmin";

/**
 * Garante que a requisição vem de uma administradora logada.
 * O navegador envia o access token da sessão em `Authorization: Bearer <token>`.
 */
export async function requireAdmin(request: Request): Promise<{ userId: string; email: string | null }> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new ApiError(401, "Sessão ausente. Entre novamente.");

  const admin = supabaseAdmin();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new ApiError(401, "Sessão expirada. Entre novamente.");

  const { data: profile } = await admin.from("profiles").select("is_admin").eq("user_id", data.user.id).maybeSingle();
  if (!profile?.is_admin) throw new ApiError(403, "Apenas administradores podem fazer isso.");

  return { userId: data.user.id, email: data.user.email ?? null };
}
