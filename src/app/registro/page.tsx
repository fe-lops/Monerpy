"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthCard, AuthTabs } from "@/components/layout";
import { Field, Spinner } from "@/components/ui";
import { registerSchema, type RegisterInput } from "@/lib/domain/schemas";
import { useData } from "@/providers/DataProvider";

/**
 * Pedido de acesso: a pessoa informa só o e-mail. Um administrador aprova ou recusa
 * em /admin/registros; se aprovado, ela recebe um link para criar a senha.
 */
export default function RegistroPage() {
  const { repo, status } = useData();
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const { register, handleSubmit, formState } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  useEffect(() => {
    if (status === "ready") router.replace("/dashboard");
  }, [status, router]);

  if (status === "loading" || status === "ready") return <Spinner />;

  const onSubmit = handleSubmit(async (data) => {
    setServerError("");
    try {
      const res = await fetch("/api/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Não foi possível enviar o pedido. Tente novamente.");
      }
      router.push("/registro/enviado");
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Não foi possível enviar o pedido.");
    }
  });

  return (
    <AuthCard title="Solicitar acesso" subtitle="Informe seu e-mail. Um administrador vai analisar o pedido e você receberá a resposta por e-mail.">
      <AuthTabs active="registro" />
      {repo.mode === "local" ? (
        <div className="panel p-4 text-sm text-ink-2">O registro de novas contas só funciona com o Supabase configurado.</div>
      ) : (
        <form className="flex flex-col gap-4" method="post" onSubmit={onSubmit} noValidate>
          <Field label="E-mail" error={formState.errors.email?.message}>
            {(id) => (
              <input id={id} type="email" autoComplete="email" inputMode="email" className="field" aria-invalid={!!formState.errors.email} {...register("email")} />
            )}
          </Field>
          {/* Campo-armadilha contra robôs: invisível para pessoas, deve ficar vazio. */}
          <input type="text" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" {...register("website")} />
          {serverError && (
            <p className="error" role="alert">
              {serverError}
            </p>
          )}
          <button type="submit" className="cta" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? "Enviando…" : "Registrar"}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
