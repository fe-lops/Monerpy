"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthCard } from "@/components/AuthCard";
import { useData } from "@/components/providers/DataProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Field, Spinner } from "@/components/ui";
import { newPasswordSchema, type NewPasswordInput } from "@/lib/schemas";

/** Erro que o Supabase devolve na URL quando o link é inválido ou expirou (?error=… ou #error=…). */
function linkErrorFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const get = (k: string) => query.get(k) ?? hash.get(k);
  if (!get("error") && !get("error_code")) return null;
  if (get("error_code") === "otp_expired") return "Este link expirou ou já foi usado.";
  return "Este link de redefinição não é válido.";
}

/**
 * Destino do link de recuperação enviado por e-mail.
 * O cliente do Supabase troca o código da URL por uma sessão ao carregar; só então a senha pode ser trocada.
 * O link só funciona no MESMO navegador em que a redefinição foi pedida (fluxo PKCE).
 */
export default function RedefinirSenhaPage() {
  const { repo, status, reload } = useData();
  const router = useRouter();
  const toast = useToast();
  const [serverError, setServerError] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<NewPasswordInput>({ resolver: zodResolver(newPasswordSchema) });

  useEffect(() => setLinkError(linkErrorFromUrl()), []);

  const onSubmit = handleSubmit(async ({ password }) => {
    setServerError("");
    try {
      await repo.updatePassword(password);
      await reload();
      toast("Senha alterada.");
      router.replace("/dashboard");
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Não foi possível alterar a senha. Peça um novo link.");
    }
  });

  if (repo.mode === "local") {
    return (
      <AuthCard title="Nova senha">
        <div className="panel p-4 text-sm text-ink-2">A redefinição de senha só funciona com o Supabase configurado.</div>
        <Link href="/login" className="linkbtn self-center">
          Voltar para o login
        </Link>
      </AuthCard>
    );
  }

  if (status === "loading" && !linkError) return <Spinner />;

  // Sem sessão: link expirado, já usado ou aberto em outro navegador/aparelho.
  if (linkError || status === "anon") {
    return (
      <AuthCard title="Link inválido">
        <div className="panel flex flex-col gap-2 p-4 text-sm" role="alert">
          <strong className="text-neg">{linkError ?? "Não foi possível validar este link."}</strong>
          <p className="text-ink-2">
            O link de redefinição vale por pouco tempo, funciona uma única vez e precisa ser aberto <strong>no mesmo navegador e aparelho</strong> em que você pediu a
            redefinição.
          </p>
        </div>
        <Link href="/recuperar-senha" className="cta">
          Pedir um novo link
        </Link>
        <Link href="/login" className="linkbtn self-center">
          Voltar para o login
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Nova senha" subtitle="Escolha uma senha com pelo menos 8 caracteres.">
      <form className="flex flex-col gap-4" method="post" onSubmit={onSubmit} noValidate>
        <Field label="Nova senha" error={formState.errors.password?.message}>
          {(id) => <input id={id} type="password" autoComplete="new-password" className="field" {...register("password")} />}
        </Field>
        <Field label="Repita a senha" error={formState.errors.confirm?.message}>
          {(id) => <input id={id} type="password" autoComplete="new-password" className="field" {...register("confirm")} />}
        </Field>
        {serverError && (
          <p className="error" role="alert">
            {serverError}
          </p>
        )}
        <button type="submit" className="cta" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? "Salvando…" : "Salvar nova senha"}
        </button>
      </form>
    </AuthCard>
  );
}
