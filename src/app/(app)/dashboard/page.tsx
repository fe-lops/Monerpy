"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Bell } from "lucide-react";
import { BarChart } from "@/components/charts";
import { useMonthPeriod, useReminders } from "@/components/hooks";
import { useReady } from "@/components/providers/DataProvider";
import { PendingRow, TxRow, useSettleFlow } from "@/components/transactions";
import { Empty, Screen, ScopeSeg } from "@/components/ui";
import { addDays } from "@/lib/dates";
import { cashProjection, displayDate, expensesByCategory, inScope, pendingDate, pendingTotals, realizedInPeriod } from "@/lib/finance";
import { brl } from "@/lib/money";

function Badge({ late, count }: { late: number; count: number }) {
  if (late) return <span className="badge badge-neg">{late === 1 ? "1 atrasada" : `${late} atrasadas`}</span>;
  if (count) return <span className="badge badge-ok">{count} em dia</span>;
  return <span className="badge badge-mute">Nada pendente</span>;
}

export default function DashboardPage() {
  const { profile, transactions, categories, balance, today, scope, setScope } = useReady();
  const { from, to, nav } = useMonthPeriod();
  const { unseen } = useReminders();
  const settle = useSettleFlow();

  const period = realizedInPeriod(transactions, from, to, scope);
  const pending = pendingTotals(transactions, today, scope);
  const allPending = pendingTotals(transactions, today, "ALL");
  const projection = cashProjection(balance, allPending);
  const byCat = expensesByCategory(transactions, categories, from, to, scope).slice(0, 5);

  const upcoming = useMemo(() => {
    const limit = addDays(today, 7);
    return transactions
      .filter((t) => t.status === "PENDING" && inScope(t, scope) && pendingDate(t) && pendingDate(t)! <= limit)
      .sort((a, b) => pendingDate(a)!.localeCompare(pendingDate(b)!))
      .slice(0, 5);
  }, [transactions, scope, today]);

  const recent = useMemo(
    () =>
      transactions
        .filter((t) => t.status === "SETTLED" && inScope(t, scope))
        .sort((a, b) => displayDate(b).localeCompare(displayDate(a)) || b.created_at.localeCompare(a.created_at))
        .slice(0, 5),
    [transactions, scope],
  );

  return (
    <Screen size="wide">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="cap">{profile.display_name ? `Olá, ${profile.display_name}` : "Olá"}</p>
          <h1 className="title">Início</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden w-[380px] lg:block">
            <ScopeSeg value={scope} onChange={setScope} small />
          </div>
          <Link href="/lembretes" className="icon-btn" aria-label={unseen ? `Lembretes: ${unseen} novos` : "Lembretes"}>
            <Bell size={24} strokeWidth={1.9} />
            {unseen > 0 && <span className="absolute right-[9px] top-2 size-[9px] rounded-full border-2 border-app bg-neg-chip" />}
          </Link>
        </div>
      </div>

      {/* Faixa 1 — celular: saldo, contexto, cartões lado a lado. Computador: 3 colunas. */}
      <div className="grid gap-5 lg:grid-cols-3 lg:gap-6">
        <section className="flex flex-col justify-center gap-1 rounded-xl bg-accent px-4 py-5 text-center text-on-accent lg:items-start lg:px-6 lg:text-left" aria-label="Saldo">
          <span>Saldo total disponível</span>
          <span className="num font-display text-[36px] font-bold leading-[44px] tracking-[-0.01em]">{brl(balance)}</span>
          <span className="text-[13px] leading-[18px] opacity-80">
            Projeção estimada: <span className="num font-semibold">{brl(projection)}</span>
          </span>
        </section>

        <div className="lg:hidden">
          <ScopeSeg value={scope} onChange={setScope} />
        </div>

        <div className="grid grid-cols-2 gap-3 lg:contents">
          <Link href="/contas-a-pagar" className="flex min-w-0 flex-col items-start gap-2 rounded-xl border-[length:var(--bd-w)] border-[var(--bd-pagar)] bg-card p-4 hover:brightness-110 lg:justify-center lg:p-6">
            <span>A pagar</span>
            <span className="num font-display text-xl font-bold leading-[26px] lg:text-[26px] lg:leading-8">{brl(pending.payable)}</span>
            <Badge late={pending.overduePayable} count={pending.payableCount} />
          </Link>
          <Link href="/contas-a-receber" className="flex min-w-0 flex-col items-start gap-2 rounded-xl border-[length:var(--bd-w)] border-[var(--bd-receber)] bg-card p-4 hover:brightness-110 lg:justify-center lg:p-6">
            <span>A receber</span>
            <span className="num font-display text-xl font-bold leading-[26px] lg:text-[26px] lg:leading-8">{brl(pending.receivable)}</span>
            <Badge late={pending.overdueReceivable} count={pending.receivableCount} />
          </Link>
        </div>
      </div>

      {/* Faixa 2 — período (1/3) e gastos por categoria (2/3). */}
      <div className="grid gap-5 lg:grid-cols-3 lg:gap-6">
        <section className="panel flex flex-col gap-3 p-4 lg:p-5">
          {nav}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 lg:gap-4">
            <div className="flex min-w-0 flex-col">
              <small className="text-xs text-ink-2">Entradas realizadas</small>
              <strong className="num font-display text-lg text-pos lg:text-2xl">{brl(period.income)}</strong>
            </div>
            <div className="flex min-w-0 flex-col">
              <small className="text-xs text-ink-2">Saídas realizadas</small>
              <strong className="num font-display text-lg text-neg lg:text-2xl">{brl(period.expense)}</strong>
            </div>
          </div>
          <p className="cap lg:mt-auto">
            Resultado de caixa no mês: <span className={`num font-semibold ${period.net < 0 ? "text-neg" : "text-ink"}`}>{brl(period.net)}</span>
          </p>
        </section>

        <section className="panel p-4 lg:col-span-2 lg:p-5">
          <h2 className="sub">Gastos por categoria</h2>
          <p className="cap">Saídas pagas no mês selecionado</p>
          {byCat.length ? <BarChart rows={byCat} label="Gastos por categoria" /> : <p className="py-6 text-center text-sm text-ink-2">Nenhuma saída paga neste mês.</p>}
        </section>
      </div>

      {/* Faixa 3 — listas lado a lado no computador. */}
      <div className="grid items-start gap-5 lg:grid-cols-2 lg:gap-6">
        <section className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between">
            <h2 className="sub">Próximos vencimentos</h2>
            <Link href="/pendencias" className="linkbtn">
              Ver todas
            </Link>
          </div>
          {upcoming.length ? (
            <ul className="list panel">
              {upcoming.map((t) => (
                <PendingRow key={t.id} tx={t} onSettle={settle.open} />
              ))}
            </ul>
          ) : (
            <Empty>Nada vencendo nos próximos 7 dias.</Empty>
          )}
        </section>

        <section className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between">
            <h2 className="sub">Últimas movimentações</h2>
            <Link href="/movimentacoes" className="linkbtn">
              Ver todas
            </Link>
          </div>
          {recent.length ? (
            <ul className="list panel">
              {recent.map((t) => (
                <TxRow key={t.id} tx={t} />
              ))}
            </ul>
          ) : (
            <Empty>Nenhuma movimentação liquidada ainda. Use “Novo lançamento” para começar.</Empty>
          )}
        </section>
      </div>
      {settle.sheet}
    </Screen>
  );
}
