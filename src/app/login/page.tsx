"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthCard } from "@/components/AuthCard";
import { useData } from "@/components/providers/DataProvider";
import { Field, Spinner } from "@/components/ui";
import { supabaseEnvProblems } from "@/lib/env";
import { loginSchema, type LoginInput } from "@/lib/schemas";

function LoginForm() {
  const { repo, status, signIn, error: loadError, reload, signOut } = useData();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  const [serverError, setServerError] = useState("");
  const local = repo.mode === "local";

  const { register, handleSubmit, formState } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  useEffect(() => {
    if (status === "ready") router.replace(target);
  }, [status, router, target]);

  if (status === "loading" || status === "ready") return <Spinner />;

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setServerError("");
    try {
      await signIn(email, password);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Não foi possível entrar.");
    }
  });

  if (local) {
    return (
      <AuthCard title="Bem-vinda ao Monerpy" subtitle="Controle de caixa pessoal e profissional, direto do celular.">
        <div className="panel flex flex-col gap-2 p-4 text-sm">
          <strong className="font-semibold">Modo local</strong>
          <p className="text-ink-2">O Supabase não foi configurado neste build. Os dados ficam salvos apenas neste navegador.</p>
          <p className="text-ink-2">Problemas encontrados neste build:</p>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-neg">
            {supabaseEnvProblems.map((v) => (
              <li key={v}>{v}</li>
            ))}
          </ul>
          <p className="text-ink-2">
            Local: preencha o <code>.env.local</code> e reinicie. Vercel: cadastre em Settings → Environment Variables (marcando Production) e faça um novo deploy.
          </p>
        </div>
        <button className="cta" onClick={() => signIn("", "")}>
          Entrar no modo local
        </button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Entrar" subtitle="Acesse seu controle de caixa.">
      {status === "error" && !serverError && (
        <div className="panel flex flex-col gap-3 p-4 text-sm" role="alert">
          <strong className="text-neg">Você entrou, mas os dados não carregaram.</strong>
          <p className="text-ink-2">{loadError}</p>
          <div className="flex gap-2">
            <button type="button" className="chip" onClick={() => reload()}>
              Tentar novamente
            </button>
            <button type="button" className="chip" onClick={() => signOut()}>
              Sair
            </button>
          </div>
        </div>
      )}
      {/* method="post": se o JavaScript falhar, a senha não vai parar na barra de endereço. */}
      <form className="flex flex-col gap-4" method="post" onSubmit={onSubmit} noValidate>
        <Field label="E-mail" error={formState.errors.email?.message}>
          {(id) => <input id={id} type="email" autoComplete="email" inputMode="email" className="field" aria-invalid={!!formState.errors.email} {...register("email")} />}
        </Field>
        <Field label="Senha" error={formState.errors.password?.message}>
          {(id) => <input id={id} type="password" autoComplete="current-password" className="field" aria-invalid={!!formState.errors.password} {...register("password")} />}
        </Field>
        {serverError && (
          <p className="error" role="alert">
            {serverError}
          </p>
        )}
        <button type="submit" className="cta" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? "Entrando…" : "Entrar"}
        </button>
        <Link href="/recuperar-senha" className="linkbtn self-center">
          Esqueci minha senha
        </Link>
      </form>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <LoginForm />
    </Suspense>
  );
}
