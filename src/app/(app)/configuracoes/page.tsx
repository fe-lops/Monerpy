"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { UserX } from "lucide-react";
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

/** Palavra que a pessoa digita para liberar a exclusão (maiúsculas ou minúsculas). */
const CONFIRM_WORD = "CONFIRMAR";

/**
 * Confirmação em duas etapas: marcar "Li e estou ciente" mostra o campo para digitar CONFIRMAR;
 * só então o botão fica vermelho e ativo. Ao excluir, vai para a página de despedida.
 */
function DeleteAccountDialog({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => Promise<void> }) {
  const [aware, setAware] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = aware && typed.trim().toUpperCase() === CONFIRM_WORD;

  function close() {
    if (busy) return;
    setAware(false);
    setTyped("");
    setError(null);
    onClose();
  }

  async function confirm() {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      window.location.replace("/conta-excluida"); // recarrega: sessão e dados em memória somem
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível excluir a conta.");
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={close} title="Excluir a sua conta?" alert>
      <p className="text-ink-2">
        Todos os seus dados — movimentações, categorias, cobranças, lembretes e dados de perfil — serão excluídos do Monerpy, e você sairá de todos os aparelhos.
        Você poderá pedir uma conta nova quando quiser.
      </p>
      <label className="flex cursor-pointer items-center gap-3 font-semibold">
        <input
          type="checkbox"
          className="size-5 flex-none accent-[var(--expense-solid)]"
          checked={aware}
          onChange={(e) => {
            setAware(e.target.checked);
            if (!e.target.checked) setTyped("");
          }}
        />
        Li e estou ciente
      </label>
      {aware && (
        <Field label={`Para confirmar, digite ${CONFIRM_WORD}`}>
          {(id) => (
            <input
              id={id}
              className="field"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={CONFIRM_WORD}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              autoFocus
            />
          )}
        </Field>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <button type="button" className="btn-ghost h-12 flex-1" onClick={close} disabled={busy}>
          Cancelar
        </button>
        <button type="button" className="cta cta-danger h-12 flex-[1.4] text-base" disabled={!ready || busy} onClick={confirm}>
          {busy ? "Excluindo…" : "Excluir minha conta"}
        </button>
      </div>
    </Sheet>
  );
}

function useTheme():["dark" | "light", (t: "dark" | "light") => void] {
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
  const { profile, today, repo, updateProfile, signOut, deleteAccount, resetAll, seedDemo, balance } = useReady();
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
  const [deleteOpen, setDeleteOpen] = useState(false);

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

      <section className="flex flex-col gap-3 border-t border-line pt-6">
        <h2 className="sub">Excluir conta</h2>
        <p className="cap">
          {repo.mode === "ghost"
            ? "Modo visitante: nada é apagado de verdade; a exclusão só encerra a visita."
            : "Apaga a sua conta e todos os seus dados do Monerpy. Não dá para desfazer."}
        </p>
        <button type="button" className="cta cta-danger" onClick={() => setDeleteOpen(true)}>
          <UserX size={20} aria-hidden /> Excluir minha conta
        </button>
      </section>

      <DeleteAccountDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={deleteAccount} />

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
