import "server-only";
import { SUPABASE_URL } from "@/lib/env";

// Variáveis SOMENTE do servidor (sem prefixo NEXT_PUBLIC_): nunca chegam ao navegador.
// Na Vercel, cadastre-as como "Sensitive".

function clean(v: string | undefined): string {
  return (v ?? "").trim().replace(/^["']|["']$/g, "").trim();
}

export const serverConfig = {
  supabaseUrl: SUPABASE_URL,
  /** Chave secreta (service_role / sb_secret_). Necessária para criar contas aprovadas. */
  serviceRoleKey: clean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  smtp: {
    host: clean(process.env.SMTP_HOST),
    port: Number(clean(process.env.SMTP_PORT) || 465),
    user: clean(process.env.SMTP_USER),
    pass: clean(process.env.SMTP_PASS),
    /** Remetente, ex.: "Monerpy <no-reply@seudominio.com>" */
    from: clean(process.env.SMTP_FROM) || clean(process.env.SMTP_USER),
  },
  /** E-mail que recebe aviso de novas solicitações (opcional). */
  adminEmail: clean(process.env.ADMIN_EMAIL),
  /** URL pública do app para os links dos e-mails (opcional; padrão: origem da requisição). */
  appUrl: clean(process.env.APP_URL).replace(/\/+$/, ""),
};

export const isAdminApiConfigured = Boolean(serverConfig.supabaseUrl && serverConfig.serviceRoleKey);
export const isSmtpConfigured = Boolean(serverConfig.smtp.host && serverConfig.smtp.user && serverConfig.smtp.pass);
