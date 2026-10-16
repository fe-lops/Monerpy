import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { isSmtpConfigured } from "@/lib/server/config";
import { handle } from "@/lib/server/http";
import { ApiError, supabaseAdmin } from "@/lib/server/supabaseAdmin";

/** GET /api/admin/registros — lista os pedidos de registro (somente administradores). */
export async function GET(request: Request) {
  return handle(async () => {
    await requireAdmin(request);
    const { data, error } = await supabaseAdmin()
      .from("registration_requests")
      .select("id, email, status, note, created_at, decided_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new ApiError(500, "Não foi possível carregar os pedidos.");
    return NextResponse.json({ requests: data, smtp: isSmtpConfigured });
  });
}
