"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthCard } from "@/components/layout";
import { useData } from "@/providers/DataProvider";
import { Field } from "@/components/ui";
import { recoverSchema, type RecoverInput } from "@/lib/domain/schemas";

export default function RecuperarSenhaPage() {
  const { repo } = useData();
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState("");
  const { register, handleSubmit, formState } = useForm<RecoverInput>({ resolver: zodResolver(recoverSchema) });

  const onSubmit = handleSubmit(async ({ email }) => {
    setServerError("");
    try {
      await repo.requestPasswordReset(email, `${window.location.origin}/redefinir-senha`);
      setSent(true);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Não foi possível enviar o e-mail.");
    }
  });

  return (
    <AuthCard title="Recuperar senha" subtitle="Enviaremos um link para você criar uma nova senha.">
      {sent ? (
        <div className="panel p-4 text-sm">
          Se este e-mail estiver cadastrado, você receberá o link em instantes. Confira também a caixa de spam.
        </div>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          <Field label="E-mail" error={formState.errors.email?.message}>
            {(id) => <input id={id} type="email" autoComplete="email" inputMode="email" className="field" {...register("email")} />}
          </Field>
          {serverError && (
            <p className="error" role="alert">
              {serverError}
            </p>
          )}
          <button type="submit" className="cta" disabled={formState.isSubmitting}>
            Enviar link
          </button>
        </form>
      )}
      <Link href="/login" className="linkbtn self-center">
        Voltar para o login
      </Link>
    </AuthCard>
  );
}
