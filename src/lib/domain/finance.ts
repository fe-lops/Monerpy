// Regras de negócio financeiras (PRD §8 e §9). Funções puras, testadas em finance.test.ts.

import { addDays, addMonths, diffDays, startOfMonth } from "./dates";
import { METHOD_LABEL, SCOPE_LABEL, STATUS_LABEL } from "./types";
import type {
  Category,
  ISODate,
  NewInstallmentPurchase,
  Profile,
  ScopeFilter,
  Transaction,
} from "./types";

export function inScope(tx: Transaction, scope: ScopeFilter): boolean {
  return scope === "ALL" || tx.scope === scope;
}

/** Data de referência de uma pendência: vencimento (despesa) ou data esperada (receita). */
export function pendingDate(tx: Transaction): ISODate | null {
  return tx.due_date ?? tx.expected_date ?? null;
}

/** Data usada para ordenar/exibir: efetiva se liquidada, prevista se pendente. */
export function displayDate(tx: Transaction): ISODate {
  return (tx.status === "SETTLED" ? tx.settled_at : pendingDate(tx)) ?? tx.transaction_date;
}

/** Regra 7 e 10: atrasada = pendente com data anterior a hoje. Sem data nunca é atrasada. */
export function isOverdue(tx: Transaction, today: ISODate): boolean {
  if (tx.status !== "PENDING") return false;
  const d = pendingDate(tx);
  return d !== null && d < today;
}

/**
 * Regra 2 / §9: saldo de abertura + entradas liquidadas − despesas liquidadas,
 * considerando apenas liquidações a partir da data de abertura. Pendentes e canceladas não entram.
 */
export function availableBalance(profile: Pick<Profile, "opening_balance" | "opening_balance_date">, txs: Transaction[]): number {
  let total = profile.opening_balance;
  for (const tx of txs) {
    if (tx.status !== "SETTLED" || !tx.settled_at) continue;
    if (tx.settled_at < profile.opening_balance_date) continue;
    total += tx.type === "INCOME" ? tx.amount : -tx.amount;
  }
  return total;
}

export interface PeriodTotals {
  income: number;
  expense: number;
  /** Resultado de caixa realizado (não é lucro). */
  net: number;
}

/** Entradas e saídas liquidadas com data efetiva dentro do período [from, to]. */
export function realizedInPeriod(txs: Transaction[], from: ISODate, to: ISODate, scope: ScopeFilter = "ALL"): PeriodTotals {
  let income = 0;
  let expense = 0;
  for (const tx of txs) {
    if (tx.status !== "SETTLED" || !tx.settled_at || !inScope(tx, scope)) continue;
    if (tx.settled_at < from || tx.settled_at > to) continue;
    if (tx.type === "INCOME") income += tx.amount;
    else expense += tx.amount;
  }
  return { income, expense, net: income - expense };
}

export interface PendingTotals {
  receivable: number;
  payable: number;
  overdueCount: number;
  receivableCount: number;
  payableCount: number;
  overdueReceivable: number;
  overduePayable: number;
}

/** Regras 5 e 6: a receber/a pagar = pendentes não canceladas. */
export function pendingTotals(txs: Transaction[], today: ISODate, scope: ScopeFilter = "ALL"): PendingTotals {
  const r: PendingTotals = { receivable: 0, payable: 0, overdueCount: 0, receivableCount: 0, payableCount: 0, overdueReceivable: 0, overduePayable: 0 };
  for (const tx of txs) {
    if (tx.status !== "PENDING" || !inScope(tx, scope)) continue;
    const late = isOverdue(tx, today);
    if (late) r.overdueCount++;
    if (tx.type === "INCOME") {
      r.receivable += tx.amount;
      r.receivableCount++;
      if (late) r.overdueReceivable++;
    } else {
      r.payable += tx.amount;
      r.payableCount++;
      if (late) r.overduePayable++;
    }
  }
  return r;
}

/** §9: projeção = saldo disponível + a receber − a pagar (estimativa). */
export function cashProjection(balance: number, pending: Pick<PendingTotals, "receivable" | "payable">): number {
  return balance + pending.receivable - pending.payable;
}

export type BucketKey = "overdue" | "today" | "week" | "future" | "nodate";

export const BUCKET_LABEL: Record<BucketKey, string> = {
  overdue: "Atrasadas",
  today: "Hoje",
  week: "Próximos 7 dias",
  future: "Futuras",
  nodate: "Sem data",
};

/** Agrupa pendências em atrasadas, hoje, próximos 7 dias, futuras e sem data. */
export function bucketPending(txs: Transaction[], today: ISODate): Record<BucketKey, Transaction[]> {
  const out: Record<BucketKey, Transaction[]> = { overdue: [], today: [], week: [], future: [], nodate: [] };
  const weekEnd = addDays(today, 7);
  for (const tx of txs) {
    if (tx.status !== "PENDING") continue;
    const d = pendingDate(tx);
    if (!d) out.nodate.push(tx);
    else if (d < today) out.overdue.push(tx);
    else if (d === today) out.today.push(tx);
    else if (d <= weekEnd) out.week.push(tx);
    else out.future.push(tx);
  }
  const byDate = (a: Transaction, b: Transaction) => (pendingDate(a) ?? "").localeCompare(pendingDate(b) ?? "") || a.created_at.localeCompare(b.created_at);
  for (const k of Object.keys(out) as BucketKey[]) out[k].sort(byDate);
  return out;
}

/** Regra 14: divide o total em N parcelas; diferença de centavos vai para a última. */
export function splitInstallments(totalCents: number, count: number): number[] {
  if (!Number.isInteger(totalCents) || totalCents <= 0) throw new Error("Valor total inválido");
  if (!Number.isInteger(count) || count < 2) throw new Error("Mínimo de 2 parcelas");
  if (totalCents < count) throw new Error("Valor menor que o número de parcelas");
  const base = Math.floor(totalCents / count);
  const values = Array.from({ length: count }, () => base);
  values[count - 1] = totalCents - base * (count - 1);
  return values;
}

/** Regra 13: um grupo gera N despesas pendentes no cartão de crédito, com vencimentos mensais. */
export function buildInstallments(p: NewInstallmentPurchase, makeId: () => string, nowIso: string): Transaction[] {
  const values = splitInstallments(p.total_amount, p.installment_count);
  return values.map((amount, i) => ({
    id: makeId(),
    category_id: p.category_id,
    installment_group_id: p.id,
    type: "EXPENSE",
    scope: p.scope,
    status: "PENDING",
    description: `${p.description} (${i + 1}/${p.installment_count})`,
    amount,
    transaction_date: p.transaction_date,
    due_date: addMonths(p.first_due_date, i),
    expected_date: null,
    settled_at: null,
    payment_method: "CREDIT_CARD",
    installment_number: i + 1,
    installment_count: p.installment_count,
    notes: null,
    created_at: nowIso,
    cancelled_at: null,
  }));
}

/** Pendências que geram lembrete interno: atrasadas ou vencendo dentro de `leadDays`. Regra 19. */
export function reminderCandidates(txs: Transaction[], today: ISODate, leadDays = 3): Transaction[] {
  const limit = addDays(today, leadDays);
  return txs
    .filter((tx) => {
      if (tx.status !== "PENDING") return false;
      const d = pendingDate(tx);
      return d !== null && d <= limit;
    })
    .sort((a, b) => (pendingDate(a) ?? "").localeCompare(pendingDate(b) ?? ""));
}

export function dueLabel(tx: Transaction, today: ISODate): string {
  const d = pendingDate(tx);
  if (!d) return "Sem data";
  const diff = diffDays(d, today);
  if (diff < 0) return `Venceu há ${-diff} ${-diff === 1 ? "dia" : "dias"}`;
  if (diff === 0) return "Vence hoje";
  if (diff === 1) return "Vence amanhã";
  return `Vence em ${diff} dias`;
}

/** Despesas liquidadas no período agrupadas por categoria (maior primeiro). */
export function expensesByCategory(
  txs: Transaction[],
  categories: Category[],
  from: ISODate,
  to: ISODate,
  scope: ScopeFilter = "ALL",
): { id: string | null; name: string; total: number }[] {
  const names = new Map(categories.map((c) => [c.id, c.name]));
  const totals = new Map<string | null, number>();
  for (const tx of txs) {
    if (tx.type !== "EXPENSE" || tx.status !== "SETTLED" || !tx.settled_at || !inScope(tx, scope)) continue;
    if (tx.settled_at < from || tx.settled_at > to) continue;
    totals.set(tx.category_id, (totals.get(tx.category_id) ?? 0) + tx.amount);
  }
  return [...totals.entries()]
    .map(([id, total]) => ({ id, name: (id && names.get(id)) || "Sem categoria", total }))
    .sort((a, b) => b.total - a.total);
}

export interface MonthFlow {
  month: ISODate; // primeiro dia do mês
  income: number;
  expense: number;
}

/** Fluxo realizado (liquidado) mês a mês, terminando no mês de `today`. */
export function realizedByMonth(txs: Transaction[], today: ISODate, months: number, scope: ScopeFilter = "ALL"): MonthFlow[] {
  const first = addMonths(startOfMonth(today), -(months - 1));
  const out: MonthFlow[] = Array.from({ length: months }, (_, i) => ({ month: addMonths(first, i), income: 0, expense: 0 }));
  for (const tx of txs) {
    if (tx.status !== "SETTLED" || !tx.settled_at || !inScope(tx, scope)) continue;
    const idx = out.findIndex((m) => m.month === startOfMonth(tx.settled_at!));
    if (idx < 0) continue;
    if (tx.type === "INCOME") out[idx].income += tx.amount;
    else out[idx].expense += tx.amount;
  }
  return out;
}

/** Fluxo previsto (pendências) por mês a partir do mês atual. Atrasadas entram no mês atual. */
export function projectedByMonth(txs: Transaction[], today: ISODate, months: number, scope: ScopeFilter = "ALL"): MonthFlow[] {
  const first = startOfMonth(today);
  const out: MonthFlow[] = Array.from({ length: months }, (_, i) => ({ month: addMonths(first, i), income: 0, expense: 0 }));
  for (const tx of txs) {
    if (tx.status !== "PENDING" || !inScope(tx, scope)) continue;
    const d = pendingDate(tx);
    if (!d) continue;
    const m = d < first ? first : startOfMonth(d);
    const idx = out.findIndex((x) => x.month === m);
    if (idx < 0) continue;
    if (tx.type === "INCOME") out[idx].income += tx.amount;
    else out[idx].expense += tx.amount;
  }
  return out;
}

// ---------- Histórico: filtros ----------

export interface HistoryFilter {
  q: string;
  from: ISODate | "";
  to: ISODate | "";
  type: "ALL" | "INCOME" | "EXPENSE";
  status: "ALL" | "PENDING" | "SETTLED" | "CANCELLED";
  scope: ScopeFilter;
  categoryId: string | "ALL";
  method: "ALL" | "PIX" | "DEBIT_CARD" | "CREDIT_CARD" | "UNSPECIFIED";
}

export const EMPTY_FILTER: HistoryFilter = { q: "", from: "", to: "", type: "ALL", status: "ALL", scope: "ALL", categoryId: "ALL", method: "ALL" };

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function applyFilter(txs: Transaction[], f: HistoryFilter, categories: Category[]): Transaction[] {
  const names = new Map(categories.map((c) => [c.id, c.name]));
  const q = normalize(f.q.trim());
  return txs
    .filter((tx) => {
      if (!inScope(tx, f.scope)) return false;
      if (f.type !== "ALL" && tx.type !== f.type) return false;
      if (f.status !== "ALL" && tx.status !== f.status) return false;
      if (f.categoryId !== "ALL" && tx.category_id !== f.categoryId) return false;
      if (f.method !== "ALL" && tx.payment_method !== f.method) return false;
      const d = displayDate(tx);
      if (f.from && d < f.from) return false;
      if (f.to && d > f.to) return false;
      if (q) {
        const hay = normalize(`${tx.description} ${(tx.category_id && names.get(tx.category_id)) || ""} ${tx.notes ?? ""}`);
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => displayDate(b).localeCompare(displayDate(a)) || b.created_at.localeCompare(a.created_at));
}

// ---------- Exportação CSV ----------

function csvCell(v: string): string {
  return /[";\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** CSV com separador ";" e vírgula decimal (abre direto no Excel em pt-BR). */
export function toCSV(txs: Transaction[], categories: Category[]): string {
  const names = new Map(categories.map((c) => [c.id, c.name]));
  const header = ["Tipo", "Contexto", "Status", "Descrição", "Categoria", "Valor", "Data de lançamento", "Vencimento/Previsão", "Data efetiva", "Forma", "Parcela", "Observações"];
  const money = (c: number) => (c / 100).toFixed(2).replace(".", ",");
  const rows = txs.map((tx) => [
    tx.type === "INCOME" ? "Entrada" : "Saída",
    SCOPE_LABEL[tx.scope],
    STATUS_LABEL[tx.status],
    tx.description,
    (tx.category_id && names.get(tx.category_id)) || "",
    money(tx.amount),
    tx.transaction_date,
    pendingDate(tx) ?? "",
    tx.settled_at ?? "",
    METHOD_LABEL[tx.payment_method],
    tx.installment_number ? `${tx.installment_number}/${tx.installment_count}` : "",
    tx.notes ?? "",
  ]);
  return "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(";")).join("\r\n");
}
