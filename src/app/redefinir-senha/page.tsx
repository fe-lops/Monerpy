"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthCard } from "@/components/AuthCard";
import { useData } from "@/components/providers/DataProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Field } from "@/components/ui";
import { newPasswordSchema, type NewPasswordInput } from "@/lib/schemas";

/** Destino do link de recuperação enviado por e-mail (o Supabase já abre a sessão pelo link). */
export default function RedefinirSenhaPage() {
  const { repo, reload } = useData();
  const router = useRouter();
  const toast = useToast();
  const [serverError, setServerError] = useState("");
  const { register, handleSubmit, formState } = useForm<NewPasswordInput>({ resolver: zodResolver(newPasswordSchema) });

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

  return (
    <AuthCard title="Nova senha">
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
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
          Salvar nova senha
        </button>
      </form>
    </AuthCard>
  );
}
