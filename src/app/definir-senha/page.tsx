"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthCard } from "@/components/layout";
import { Field, Spinner } from "@/components/ui";
import { newPasswordSchema, type NewPasswordInput } from "@/lib/domain/schemas";
import { useData } from "@/providers/DataProvider";
import { useToast } from "@/providers/ToastProvider";

type LinkType = "invite" | "magiclink";

/**
 * Destino do link enviado quando o administrador APROVA um registro.
 * O link traz `?token_hash=…&type=invite|magiclink`; validamos o token, abrimos a sessão
 * e a pessoa cria a senha. Funciona em qualquer navegador (não depende de PKCE).
 * Sem token na URL (convite padrão do Supabase), usa a sessão que o próprio cliente abre.
 */
export default function DefinirSenhaPage() {
  const { repo, status, reload } = useData();
  const router = useRouter();
  const toast = useToast();
  const [phase, setPhase] = useState<"verifying" | "form" | "invalid">("verifying");
  const [linkError, setLinkError] = useState("");
  const [serverError, setServerError] = useState("");
  const started = useRef(false);
  const { register, handleSubmit, formState } = useForm<NewPasswordInput>({ resolver: zodResolver(newPasswordSchema) });

  useEffect(() => {
    if (started.current) return; // o token é de uso único: valida só uma vez
    started.current = true;
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get("token_hash");
    const type = params.get("type") as LinkType | null;
    if (!tokenHash || (type !== "invite" && type !== "magiclink")) return; // segue pelo fallback abaixo

    repo
      .verifyEmailToken(tokenHash, type)
      .then(async () => {
        window.history.replaceState(null, "", "/definir-senha"); // tira o token da barra de endereço
        await reload();
        setPhase("form");
      })
      .catch((e) => {
        setLinkError(e instanceof Error ? e.message : "Link inválido.");
        setPhase("invalid");
      });
  }, [repo, reload]);

  // Fallback sem token_hash: aguarda a sessão aberta pelo cliente do Supabase.
  useEffect(() => {
    if (phase !== "verifying" || new URLSearchParams(window.location.search).get("token_hash")) return;
    if (status === "ready" || status === "error") setPhase("form");
    if (status === "anon") setPhase("invalid");
  }, [status, phase]);

  const onSubmit = handleSubmit(async ({ password }) => {
    setServerError("");
    try {
      await repo.updatePassword(password);
      await reload();
      toast("Senha criada. Bem-vinda ao Monerpy!");
      router.replace("/dashboard"); // o layout leva à configuração inicial do saldo
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Não foi possível salvar a senha.");
    }
  });

  if (phase === "verifying") return <Spinner />;

  if (phase === "invalid") {
    return (
      <AuthCard title="Link inválido">
        <div className="panel flex flex-col gap-2 p-4 text-sm" role="alert">
          <strong className="text-neg">{linkError || "Não foi possível validar este link."}</strong>
          <p className="text-ink-2">O link de criação de senha vale por tempo limitado e funciona uma única vez. Peça ao administrador para reenviar.</p>
        </div>
        <Link href="/login" className="btn-ghost">
          Ir para o login
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Crie sua senha" subtitle="Seu acesso foi aprovado. Escolha uma senha com pelo menos 8 caracteres para concluir o cadastro.">
      <form className="flex flex-col gap-4" method="post" onSubmit={onSubmit} noValidate>
        <Field label="Senha" error={formState.errors.password?.message}>
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
          {formState.isSubmitting ? "Salvando…" : "Criar senha e entrar"}
        </button>
      </form>
    </AuthCard>
  );
}
