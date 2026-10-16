import { NextResponse } from "next/server";
import { registrationDecisionSchema } from "@/lib/domain/schemas";
import { requireAdmin } from "@/lib/server/auth";
import { approvedEmail, rejectedEmail } from "@/lib/server/emails";
import { appUrl, handle } from "@/lib/server/http";
import { isSmtpConfigured, sendMail } from "@/lib/server/mailer";
import { ApiError, assertKeyAccepted, supabaseAdmin } from "@/lib/server/supabaseAdmin";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/registros/:id  { action: "approve" | "reject", note? }
 *
 * Aprovar: cria a conta (convite) e envia o link para a pessoa criar a senha.
 *          Vale para pedido pendente, recusado (o administrador muda de ideia: vai para Aprovados)
 *          ou já aprovado (reenvia um link novo).
 * Recusar: marca como recusado e envia o e-mail de recusa.
 */
export async function POST(request: Request, { params }: Ctx) {
  return handle(async () => {
    const adminUser = await requireAdmin(request);
    const { id } = await params;
    const parsed = registrationDecisionSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? "Dados inválidos.");
    const { action, note } = parsed.data;

    const db = supabaseAdmin();
    const { data: req, error } = await db.from("registration_requests").select("id, email, status").eq("id", id).maybeSingle();
    assertKeyAccepted(error);
    if (error || !req) throw new ApiError(404, "Pedido não encontrado.");

    const decided = { decided_at: new Date().toISOString(), decided_by: adminUser.userId };

    if (action === "reject") {
      if (req.status !== "PENDING") throw new ApiError(409, "Este pedido já foi decidido.");
      const { error: upErr } = await db
        .from("registration_requests")
        .update({ status: "REJECTED", note: note || null, ...decided })
        .eq("id", id);
      if (upErr) throw new ApiError(500, "Não foi possível recusar o pedido.");
      const emailSent = await trySend(req.email, rejectedEmail(note || null));
      return NextResponse.json({ ok: true, emailSent });
    }

    await sendApprovalLink(req.email, `${appUrl(request)}/definir-senha`);
    const { error: upErr } = await db.from("registration_requests").update({ status: "APPROVED", note: null, ...decided }).eq("id", id);
    if (upErr) throw new ApiError(500, "Conta criada, mas não foi possível atualizar o pedido.");
    return NextResponse.json({ ok: true, emailSent: true });
  });
}

/**
 * Cria a conta (se ainda não existir) e envia o link para criar a senha.
 * Com SMTP: link próprio com token_hash (funciona em qualquer navegador/aparelho).
 * Sem SMTP: convite padrão do Supabase (sujeito ao limite de e-mails do projeto).
 */
async function sendApprovalLink(email: string, redirectTo: string): Promise<void> {
  const auth = supabaseAdmin().auth.admin;

  if (!isSmtpConfigured) {
    const { error } = await auth.inviteUserByEmail(email, { redirectTo });
    assertKeyAccepted(error);
    if (error) {
      if (/already been registered|already exists/i.test(error.message))
        throw new ApiError(409, "Este e-mail já tem conta. Configure o SMTP para reenviar o link, ou peça para a pessoa usar “Esqueci minha senha”.");
      if (/rate limit/i.test(error.message)) throw new ApiError(429, "Limite de e-mails do Supabase atingido. Configure um SMTP próprio (veja o README).");
      throw new ApiError(500, `Não foi possível enviar o convite: ${error.message}`);
    }
    return;
  }

  // Conta nova → "invite"; conta já criada (reenvio) → "magiclink".
  let type: "invite" | "magiclink" = "invite";
  let res = await auth.generateLink({ type: "invite", email, options: { redirectTo } });
  if (res.error && /already been registered|already exists/i.test(res.error.message)) {
    type = "magiclink";
    res = await auth.generateLink({ type: "magiclink", email, options: { redirectTo } });
  }
  assertKeyAccepted(res.error);
  if (res.error || !res.data.properties?.hashed_token) throw new ApiError(500, `Não foi possível gerar o link: ${res.error?.message ?? "sem token"}`);

  const link = `${redirectTo}?token_hash=${encodeURIComponent(res.data.properties.hashed_token)}&type=${type}`;
  try {
    await sendMail({ to: email, ...approvedEmail(link) });
  } catch (e) {
    console.error("[registros] envio do link", e);
    throw new ApiError(502, "Conta criada, mas o e-mail não foi enviado. Confira o SMTP e clique em “Reenviar link”.");
  }
}

/** Envia e-mail sem interromper a decisão se o SMTP falhar. Retorna se foi enviado. */
async function trySend(to: string, mail: { subject: string; html: string; text: string }): Promise<boolean> {
  if (!isSmtpConfigured) return false;
  try {
    await sendMail({ to, ...mail });
    return true;
  } catch (e) {
    console.error("[registros] envio de e-mail", e);
    return false;
  }
}
