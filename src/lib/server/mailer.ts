import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { isSmtpConfigured, serverConfig } from "./config";

let transporter: Transporter | null = null;

/**
 * Envia e-mail pelo SMTP configurado (Gmail, Brevo, Resend…).
 * É o mesmo SMTP que deve ser configurado no Supabase para os e-mails de login/recuperação.
 */
export async function sendMail(msg: { to: string; subject: string; html: string; text: string }): Promise<void> {
  if (!isSmtpConfigured) throw new Error("SMTP não configurado (SMTP_HOST, SMTP_USER, SMTP_PASS).");
  const { host, port, user, pass, from } = serverConfig.smtp;
  transporter ??= nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
  await transporter.sendMail({ from, ...msg });
}

export { isSmtpConfigured };
