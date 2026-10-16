import "server-only";

// Modelos dos e-mails transacionais do registro. HTML simples com estilos inline
// (clientes de e-mail ignoram <style>), sempre com versão em texto puro.

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function layout(title: string, body: string): string {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f1f5f9;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0f172a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;padding:32px">
<tr><td style="font-size:20px;font-weight:800;padding-bottom:24px"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#a3e635;margin-right:8px"></span>Monerpy</td></tr>
<tr><td><h1 style="font-size:22px;line-height:28px;margin:0 0 12px">${esc(title)}</h1>${body}</td></tr>
</table>
<p style="font-size:12px;color:#64748b;margin-top:16px">Você recebeu este e-mail porque pediu acesso ao Monerpy.</p>
</td></tr></table></body></html>`;
}

const p = (t: string) => `<p style="font-size:15px;line-height:22px;margin:0 0 16px;color:#334155">${t}</p>`;

export function approvedEmail(link: string) {
  return {
    subject: "Seu acesso ao Monerpy foi aprovado",
    html: layout(
      "Registro aprovado 🎉",
      p("Boa notícia! Seu pedido de acesso ao Monerpy foi aprovado.") +
        p("Clique no botão abaixo para criar sua senha e concluir o cadastro.") +
        `<p style="margin:24px 0"><a href="${esc(link)}" style="display:inline-block;background:#a3e635;color:#0f172a;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:999px">Criar minha senha</a></p>` +
        p(`<span style="font-size:13px;color:#64748b">O link vale por tempo limitado e funciona uma única vez. Se expirar, peça ao administrador para aprovar novamente.</span>`),
    ),
    text: `Seu pedido de acesso ao Monerpy foi aprovado.\n\nCrie sua senha neste link (válido por tempo limitado, uso único):\n${link}`,
  };
}

export function rejectedEmail(note: string | null) {
  return {
    subject: "Atualização do seu pedido de acesso ao Monerpy",
    html: layout(
      "Registro não aprovado",
      p("Seu pedido de acesso ao Monerpy foi analisado e <strong>recusado</strong> pelo administrador do sistema.") +
        (note ? p(`<strong>Motivo:</strong> ${esc(note)}`) : "") +
        p("Se acredita que houve um engano, responda a este e-mail."),
    ),
    text: `Seu pedido de acesso ao Monerpy foi recusado pelo administrador do sistema.${note ? `\nMotivo: ${note}` : ""}\n\nSe acredita que houve um engano, responda a este e-mail.`,
  };
}

export function adminNoticeEmail(email: string, panelUrl: string) {
  return {
    subject: `Novo pedido de registro: ${email}`,
    html: layout(
      "Novo pedido de registro",
      p(`<strong>${esc(email)}</strong> pediu acesso ao Monerpy.`) +
        `<p style="margin:24px 0"><a href="${esc(panelUrl)}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:999px">Abrir Registros</a></p>`,
    ),
    text: `${email} pediu acesso ao Monerpy.\nAprove ou recuse em: ${panelUrl}`,
  };
}
