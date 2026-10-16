"use client";

import { BarChart, InOutChart } from "@/components/charts";
import { useMonthPeriod } from "@/hooks";
import { useReady } from "@/providers/DataProvider";
import { PageHeader, Screen, ScopeSeg } from "@/components/ui";
import { monthShort } from "@/lib/domain/dates";
import { cashProjection, expensesByCategory, pendingTotals, projectedByMonth, realizedByMonth, realizedInPeriod } from "@/lib/domain/finance";
import { brl } from "@/lib/domain/money";

/** Relatórios simples de caixa (PRD §5): sem lucro por atendimento. */
export default function RelatoriosPage() {
  const { transactions, categories, today, scope, setScope, balance } = useReady();
  const { from, to, nav } = useMonthPeriod();

  const realized = realizedByMonth(transactions, today, 6, scope);
  const projected = projectedByMonth(transactions, today, 3, scope);
  const period = realizedInPeriod(transactions, from, to, scope);
  const byCat = expensesByCategory(transactions, categories, from, to, scope);
  const catTotal = byCat.reduce((s, c) => s + c.total, 0);
  const pend = pendingTotals(transactions, today, "ALL");

  return (
    <Screen size="wide">
      <PageHeader title="Relatórios" back="/mais" />
      <div className="lg:max-w-[420px]">
        <ScopeSeg value={scope} onChange={setScope} />
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2 lg:gap-6">

      <section className="panel p-4">
        <h2 className="sub">Entradas x saídas realizadas</h2>
        <p className="cap">Últimos 6 meses · somente valores liquidados</p>
        <InOutChart rows={realized.map((m) => ({ label: monthShort(m.month), income: m.income, expense: m.expense }))} label="Entradas e saídas por mês" />
      </section>

      <section className="panel flex flex-col gap-3 p-4">
        {nav}
        <dl className="grid grid-cols-3 gap-2 text-center">
          <div>
            <dt className="text-xs text-ink-2">Entradas</dt>
            <dd className="num font-semibold text-pos">{brl(period.income)}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-2">Saídas</dt>
            <dd className="num font-semibold text-neg">{brl(period.expense)}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-2">Resultado</dt>
            <dd className="num font-semibold">{brl(period.net)}</dd>
          </div>
        </dl>
        <p className="cap">Resultado de caixa realizado — não representa lucro.</p>
      </section>

      <section className="panel p-4">
        <h2 className="sub">Despesas por categoria</h2>
        <p className="cap">Saídas pagas no mês selecionado</p>
        {byCat.length ? (
          <>
            <BarChart rows={byCat.slice(0, 5)} label="Despesas por categoria" />
            <ul className="mt-4 flex flex-col gap-2 text-sm">
              {byCat.map((c) => (
                <li key={c.id ?? "none"} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate">{c.name}</span>
                  <span className="flex items-center gap-3">
                    <span className="num text-xs text-ink-2">{Math.round((c.total / catTotal) * 100)}%</span>
                    <span className="num font-semibold">{brl(c.total)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="py-6 text-center text-sm text-ink-2">Nenhuma saída paga neste mês.</p>
        )}
      </section>

      <section className="panel p-4">
        <h2 className="sub">Fluxo de caixa previsto</h2>
        <p className="cap">Pendências por mês de vencimento · atrasadas contam no mês atual</p>
        <ul className="mt-3 flex flex-col">
          {projected.map((m) => (
            <li key={m.month} className="flex items-center justify-between gap-3 border-line py-2.5 [&+&]:border-t">
              <span className="capitalize">{monthShort(m.month)}</span>
              <span className="flex gap-4 text-sm">
                <span className="num text-pos">+{brl(m.income)}</span>
                <span className="num text-neg">−{brl(m.expense)}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 rounded-xl bg-input p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-2">Saldo disponível</span>
            <span className="num font-semibold">{brl(balance)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-2">Projeção (todas as pendências)</span>
            <span className="num font-semibold">{brl(cashProjection(balance, pend))}</span>
          </div>
          <p className="cap mt-1">Estimativa: saldo + a receber − a pagar. Não é garantia de saldo futuro.</p>
        </div>
      </section>
      </div>
    </Screen>
  );
}
