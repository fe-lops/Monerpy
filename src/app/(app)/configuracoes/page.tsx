"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useReady } from "@/providers/DataProvider";
import { useToast } from "@/providers/ToastProvider";
import { Field, MoneyInput, PageHeader, Screen, Seg, Sheet } from "@/components/ui";
import { brl } from "@/lib/domain/money";
import { fieldErrors, newPasswordSchema, openingSchema } from "@/lib/domain/schemas";

const TIMEZONES: [string, string][] = [
  ["America/Sao_Paulo", "Brasília (SP, RJ, ES, MG, Sul, NE…)"],
  ["America/Manaus", "Amazonas (AM, RR, RO, MT, MS)"],
  ["America/Rio_Branco", "Acre"],
  ["America/Noronha", "Fernando de Noronha"],
];

function useTheme(): ["dark" | "light", (t: "dark" | "light") => void] {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    setTheme(document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark");
  }, []);
  return [
    theme,
    (t) => {
      document.documentElement.setAttribute("data-theme", t);
      try {
        localStorage.setItem("monerpy-tema", t);
      } catch {}
      setTheme(t);
    },
  ];
}

export default function ConfiguracoesPage() {
  const { profile, today, repo, updateProfile, signOut, resetAll, seedDemo, balance } = useReady();
  const toast = useToast();
  const router = useRouter();
  const [theme, setTheme] = useTheme();

  const [name, setName] = useState(profile.display_name);
  const [opening, setOpening] = useState(Math.abs(profile.opening_balance));
  const [negative, setNegative] = useState(profile.opening_balance < 0);
  const [openingDate, setOpeningDate] = useState(profile.opening_balance_date);
  const [tz, setTz] = useState(profile.timezone);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ password: "", confirm: "" });
  const [pwErr, setPwErr] = useState<Record<string, string>>({});
  const [resetOpen, setResetOpen] = useState(false);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    const parsed = openingSchema.safeParse({ display_name: name, opening_balance: negative ? -opening : opening, opening_balance_date: openingDate });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    if (openingDate > today) return setErrors({ opening_balance_date: "A data não pode estar no futuro." });
    setErrors({});
    setBusy(true);
    try {
      await updateProfile({ ...parsed.data, timezone: tz });
      toast("Configurações salvas.");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Não foi possível salvar.", { tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function changePassword() {
    const parsed = newPasswordSchema.safeParse(pw);
    if (!parsed.success) return setPwErr(fieldErrors(parsed.error));
    try {
      await repo.updatePassword(parsed.data.password);
      setPwOpen(false);
      setPw({ password: "", confirm: "" });
      toast("Senha alterada.");
    } catch (err) {
      setPwErr({ password: err instanceof Error ? err.message : "Não foi possível alterar." });
    }
  }

  return (
    <Screen size="narrow">
      <PageHeader title="Configurações" back="/mais" />

      <form className="flex flex-col gap-4" onSubmit={saveProfile} noValidate>
        <h2 className="sub">Perfil e saldo</h2>
        <Field label="Nome">{(id) => <input id={id} className="field" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />}</Field>
        <Field label="Saldo inicial" error={errors.opening_balance} hint={`Saldo total atual calculado: ${brl(balance)}`}>
          {(id) => <MoneyInput id={id} cents={opening} onChange={setOpening} />}
        </Field>
        <Seg
          label="Sinal do saldo inicial"
          small
          value={negative ? "neg" : "pos"}
          onChange={(v) => setNegative(v === "neg")}
          options={[
            ["pos", "Positivo"],
            ["neg", "Negativo"],
          ]}
        />
        <Field label="Data do saldo inicial" error={errors.opening_balance_date} hint="Liquidações a partir desta data alteram o saldo.">
          {(id) => <input id={id} type="date" className="field" max={today} value={openingDate} onChange={(e) => setOpeningDate(e.target.value)} />}
        </Field>
        <Field label="Fuso horário">
          {(id) => (
            <select id={id} className="field" value={tz} onChange={(e) => setTz(e.target.value)}>
              {TIMEZONES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          )}
        </Field>
        <button type="submit" className="cta" disabled={busy}>
          Salvar
        </button>
      </form>

      <section className="flex flex-col gap-2.5">
        <h2 className="sub">Aparência</h2>
        <Seg
          label="Tema"
          value={theme}
          onChange={setTheme}
          options={[
            ["dark", "Escuro"],
            ["light", "Claro"],
          ]}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="sub">Segurança e dados</h2>
        {repo.mode === "supabase" && (
          <button type="button" className="btn-ghost" onClick={() => setPwOpen(true)}>
            Alterar senha
          </button>
        )}
        <Link href="/exportar" className="btn-ghost">
          Exportar meus dados (CSV)
        </Link>
        {seedDemo && repo.mode === "local" && (
          <button
            type="button"
            className="btn-ghost"
            onClick={async () => {
              await seedDemo();
              toast("Dados de exemplo adicionados.");
            }}
          >
            Adicionar dados de exemplo
          </button>
        )}
        {resetAll && (
          <button type="button" className="btn-ghost danger" onClick={() => setResetOpen(true)}>
            {repo.mode === "ghost" ? "Restaurar dados de exemplo" : "Apagar todos os dados deste navegador"}
          </button>
        )}
        <button
          type="button"
          className="btn-ghost"
          onClick={async () => {
            await signOut();
            router.replace("/login");
          }}
        >
          Sair
        </button>
        {repo.mode === "ghost" && <p className="cap">Modo visitante: nada é salvo. Atualizar a página também restaura o exemplo.</p>}
        {repo.mode === "local" && (
          <p className="cap">Modo local: os dados ficam só neste navegador. Configure o Supabase para ter login, backup e acesso de outros aparelhos.</p>
        )}
      </section>

      <Sheet open={pwOpen} onClose={() => setPwOpen(false)} title="Alterar senha">
        <Field label="Nova senha" error={pwErr.password}>
          {(id) => <input id={id} type="password" autoComplete="new-password" className="field" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} />}
        </Field>
        <Field label="Repita a senha" error={pwErr.confirm}>
          {(id) => <input id={id} type="password" autoComplete="new-password" className="field" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />}
        </Field>
        <button type="button" className="cta" onClick={changePassword}>
          Salvar nova senha
        </button>
      </Sheet>

      <Sheet open={resetOpen} onClose={() => setResetOpen(false)} title="Apagar todos os dados?">
        <p className="text-ink-2">Todas as movimentações, categorias e configurações deste navegador serão apagadas. Exporte o CSV antes, se quiser guardar.</p>
        <button
          type="button"
          className="cta"
          style={{ background: "var(--neg-chip)", color: "#fff" }}
          onClick={async () => {
            await resetAll?.();
            setResetOpen(false);
            router.replace("/onboarding");
          }}
        >
          Apagar tudo
        </button>
        <button type="button" className="btn-ghost" onClick={() => setResetOpen(false)}>
          Manter dados
        </button>
      </Sheet>
    </Screen>
  );
}
