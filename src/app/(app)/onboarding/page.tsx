"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthCard } from "@/components/layout";
import { useReady } from "@/providers/DataProvider";
import { Field, MoneyInput, Seg } from "@/components/ui";
import { fieldErrors, openingSchema } from "@/lib/domain/schemas";

/** Configuração inicial: saldo total de abertura (PRD §3 e §7 — não é uma receita). */
export default function OnboardingPage() {
  const { profile, today, updateProfile, seedDemo } = useReady();
  const router = useRouter();
  const [name, setName] = useState(profile.display_name);
  const [cents, setCents] = useState(0);
  const [sign, setSign] = useState<"pos" | "neg">("pos");
  const [date, setDate] = useState(today);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const data = { display_name: name, opening_balance: sign === "neg" ? -cents : cents, opening_balance_date: date };
    const parsed = openingSchema.safeParse(data);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    if (date > today) return setErrors({ opening_balance_date: "A data não pode estar no futuro." });
    setBusy(true);
    try {
      await updateProfile({ ...parsed.data, onboarded: true });
      router.replace("/dashboard");
    } catch (err) {
      setErrors({ _: err instanceof Error ? err.message : "Não foi possível salvar." });
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Vamos começar" subtitle="Informe quanto dinheiro você tem hoje, somando tudo (banco, carteira, Pix). Esse é o ponto de partida do seu caixa.">
      <form className="flex flex-col gap-5" onSubmit={submit} noValidate>
        <Field label="Como quer ser chamada? (opcional)">
          {(id) => <input id={id} className="field" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" />}
        </Field>
        <Field label="Saldo total hoje" error={errors.opening_balance}>
          {(id) => <MoneyInput id={id} big cents={cents} onChange={setCents} />}
        </Field>
        <Seg
          label="Sinal do saldo"
          small
          value={sign}
          onChange={setSign}
          options={[
            ["pos", "Tenho este valor"],
            ["neg", "Estou devendo"],
          ]}
        />
        <Field label="Data de referência" error={errors.opening_balance_date} hint="Pagamentos e recebimentos a partir desta data alteram o saldo.">
          {(id) => <input id={id} type="date" className="field" value={date} max={today} onChange={(e) => setDate(e.target.value)} />}
        </Field>
        {errors._ && (
          <p className="error" role="alert">
            {errors._}
          </p>
        )}
        <button type="submit" className="cta" disabled={busy}>
          Começar
        </button>
        {seedDemo && (
          <button
            type="button"
            className="btn-ghost"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await seedDemo();
              router.replace("/dashboard");
            }}
          >
            Explorar com dados de exemplo
          </button>
        )}
      </form>
    </AuthCard>
  );
}
