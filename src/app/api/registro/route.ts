import { NextResponse } from "next/server";
import { registerSchema } from "@/lib/domain/schemas";
import { serverConfig } from "@/lib/server/config";
import { adminNoticeEmail } from "@/lib/server/emails";
import { appUrl, handle } from "@/lib/server/http";
import { isSmtpConfigured, sendMail } from "@/lib/server/mailer";
import { ApiError, assertKeyAccepted, isMissingTable, supabaseAdmin } from "@/lib/server/supabaseAdmin";

/** Mensagem pública: detalhes de configuração aparecem só para administradores e nos logs. */
const UNAVAILABLE = "Registro indisponível no momento por um problema de configuração. Tente mais tarde ou avise o administrador.";

const APPROVED_MESSAGE = "Este e-mail já teve o acesso aprovado. Use “Entrar”; se ainda não criou a senha, use “Esqueci minha senha”.";

function rejectedMessage(): string {
  const contact = serverConfig.supportEmail ? `pelo e-mail ${serverConfig.supportEmail}` : "com o suporte do Monerpy";
  return `Já existe uma solicitação de acesso para este e-mail, e ela não foi aprovada. Se acredita que houve um engano, entre em contato ${contact}.`;
}

/** 409 com `code` para a tela mostrar o aviso adequado. */
function conflict(code: "REJECTED" | "APPROVED", error: string) {
  return NextResponse.json({ error, code }, { status: 409 });
}

/**
 * POST /api/registro — visitante pede acesso informando o e-mail.
 * E-mail já recusado não pode pedir de novo (409 REJECTED); já aprovado é orientado a entrar (409 APPROVED).
 * Pedido pendente repetido responde como sucesso, sem duplicar.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const parsed = registerSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? "Dados inválidos.");
    if (parsed.data.website) return NextResponse.json({ ok: true }); // robô preencheu o campo-armadilha

    const { email } = parsed.data;
    let error: { code?: string; message: string } | null;
    try {
      const db = supabaseAdmin();

      // Histórico deste e-mail: recusado não pode pedir de novo; aprovado deve entrar.
      const { data: previous, error: lookupError } = await db
        .from("registration_requests")
        .select("status")
        .eq("email", email)
        .in("status", ["REJECTED", "APPROVED"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      assertKeyAccepted(lookupError);
      if (previous?.status === "REJECTED") return conflict("REJECTED", rejectedMessage());
      if (previous?.status === "APPROVED") return conflict("APPROVED", APPROVED_MESSAGE);

      ({ error } = await db.from("registration_requests").insert({ email }));
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
