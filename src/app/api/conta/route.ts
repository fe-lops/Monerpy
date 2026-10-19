import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { handle } from "@/lib/server/http";
import { ApiError, assertKeyAccepted, isMissingTable, supabaseAdmin } from "@/lib/server/supabaseAdmin";

/**
 * DELETE /api/conta — exclui a conta de quem está logado.
 * Apagar o usuário do Auth apaga em cascata perfil, categorias, movimentações, cobranças e
 * lembretes (on delete cascade nas migrations). O pedido de registro do e-mail também é apagado,
 * para que a pessoa possa pedir acesso de novo no futuro.
 */
export async function DELETE(request: Request) {
  return handle(async () => {
    const { userId, email } = await requireUser(request);
    const admin = supabaseAdmin();

    const { error } = await admin.auth.admin.deleteUser(userId);
    assertKeyAccepted(error);
    if (error) {
      console.error("[conta] deleteUser", error.message);
      throw new ApiError(500, "Não foi possível excluir a conta. Tente novamente.");
    }

    if (email) {
      const { error: reqError } = await admin.from("registration_requests").delete().eq("email", email.toLowerCase());
      if (reqError && !isMissingTable(reqError)) console.error("[conta] registration_requests", reqError.code, reqError.message);
    }
    return NextResponse.json({ ok: true });
  });
}
