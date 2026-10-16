import { NextResponse } from "next/server";
import { registerSchema } from "@/lib/domain/schemas";
import { serverConfig } from "@/lib/server/config";
import { adminNoticeEmail } from "@/lib/server/emails";
import { appUrl, handle } from "@/lib/server/http";
import { isSmtpConfigured, sendMail } from "@/lib/server/mailer";
import { ApiError, assertKeyAccepted, isMissingTable, supabaseAdmin } from "@/lib/server/supabaseAdmin";

/** Mensagem pública: detalhes de configuração aparecem só para administradores e nos logs. */
const UNAVAILABLE = "Registro indisponível no momento por um problema de configuração. Tente mais tarde ou avise o administrador.";

/**
 * POST /api/registro — visitante pede acesso informando o e-mail.
 * Resposta é sempre a mesma em caso de sucesso, para não revelar quais e-mails já existem.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const parsed = registerSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? "Dados inválidos.");
    if (parsed.data.website) return NextResponse.json({ ok: true }); // robô preencheu o campo-armadilha

    const { email } = parsed.data;
    let error: { code?: string; message: string } | null;
    try {
      ({ error } = await supabaseAdmin().from("registration_requests").insert({ email }));
      assertKeyAccepted(error);
    } catch (e) {
      console.error("[registro] configuração", e instanceof Error ? e.message : e);
      throw new ApiError(503, UNAVAILABLE);
    }

    // 23505 = já existe um pedido pendente para este e-mail: tratamos como sucesso.
    if (error && error.code !== "23505") {
      console.error("[registro] insert", error.code, error.message);
      if (isMissingTable(error)) throw new ApiError(503, UNAVAILABLE); // migration de registro não executada
      throw new ApiError(500, "Não foi possível registrar o pedido. Tente novamente.");
    }

    // Aviso ao administrador: melhor esforço, não bloqueia o pedido.
    if (!error && isSmtpConfigured && serverConfig.adminEmail) {
      const mail = adminNoticeEmail(email, `${appUrl(request)}/admin/registros`);
      await sendMail({ to: serverConfig.adminEmail, ...mail }).catch((e) => console.error("[registro] aviso ao admin", e));
    }

    return NextResponse.json({ ok: true });
  });
}
