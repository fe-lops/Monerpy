// Cobranças no cartão de crédito: parcelar/repetir com periodicidade e fixa mensal.
// Funções puras (sem rede/React), testadas em recurrence.test.ts.

import { addDays, addMonths } from "./dates";
import { splitInstallments } from "./finance";
import type { ISODate, InstallmentGroup, NewTransactionGroup, Periodicity, Transaction } from "./types";

/** Quantos meses à frente a cobrança fixa mensal é gerada (as seguintes surgem nos próximos acessos). */
export const FIXED_HORIZON_MONTHS = 2;

export const MAX_INSTALLMENTS = 360;

/** Passo de cada periodicidade: em meses ou em dias. Quinzenal = 15 dias. */
const STEP: Record<Exclude<Periodicity, "CUSTOM">, { months?: number; days?: number }> = {
  DAILY: { days: 1 },
  WEEKLY: { days: 7 },
  BIWEEKLY: { days: 15 },
  MONTHLY: { months: 1 },
  BIMONTHLY: { months: 2 },
  QUARTERLY: { months: 3 },
  SEMIANNUAL: { months: 6 },
  ANNUAL: { months: 12 },
};

/**
 * Data da cobrança de índice `index` (0 = primeira). Calculada sempre a partir da primeira data,
 * para não acumular desvios de fim de mês (31/01 → 28/02 → 31/03).
 */
export function occurrenceDate(first: ISODate, index: number, periodicity: Periodicity, intervalDays: number | null = null): ISODate {
  if (periodicity === "CUSTOM") {
    if (!intervalDays || intervalDays < 1) throw new Error("Informe o intervalo em dias.");
    return addDays(first, index * intervalDays);
  }
  const step = STEP[periodicity];
  return step.months ? addMonths(first, index * step.months) : addDays(first, index * step.days!);
}

/** Valores de cada cobrança: TOTAL divide (centavos na última); EACH repete o valor. */
export function groupAmounts(amount: number, count: number, mode: "TOTAL" | "EACH"): number[] {
  if (mode === "EACH") {
    if (!Number.isInteger(amount) || amount <= 0) throw new Error("Valor inválido");
    return Array.from({ length: count }, () => amount);
  }
  return splitInstallments(amount, count);
}

/** Linha de cobrança de um grupo (sempre pendente, no crédito). */
function occurrence(group: InstallmentGroup, number: number, amount: number, transactionDate: ISODate, makeId: () => string, nowIso: string): Transaction {
  const date = occurrenceDate(group.first_due_date, number - 1, group.periodicity, group.interval_days);
  const income = group.type === "INCOME";
  return {
    id: makeId(),
    category_id: group.category_id,
    installment_group_id: group.id,
    type: group.type,
    scope: group.scope,
    status: "PENDING",
    description: group.installment_count ? `${group.description} (${number}/${group.installment_count})` : group.description,
    amount,
    transaction_date: transactionDate,
    due_date: income ? null : date,
    expected_date: income ? date : null,
    settled_at: null,
    payment_method: "CREDIT_CARD",
    installment_number: number,
    installment_count: group.installment_count,
    notes: null,
    created_at: nowIso,
    cancelled_at: null,
  };
}

/**
 * Monta o grupo e suas cobranças iniciais.
 * INSTALLMENT: todas as N cobranças. FIXED: da primeira até o horizonte (`today` + FIXED_HORIZON_MONTHS), no mínimo 1.
 */
export function buildGroup(p: NewTransactionGroup, makeId: () => string, nowIso: string, today: ISODate): { group: InstallmentGroup; transactions: Transaction[] } {
  if (p.kind === "INSTALLMENT") {
    const count = p.installment_count ?? 0;
    if (!Number.isInteger(count) || count < 2 || count > MAX_INSTALLMENTS) throw new Error(`Entre 2 e ${MAX_INSTALLMENTS} cobranças.`);
    const values = groupAmounts(p.amount, count, p.amount_mode);
    const group = toGroup(p, values.reduce((s, v) => s + v, 0), count);
    return { group, transactions: values.map((v, i) => occurrence(group, i + 1, v, p.transaction_date, makeId, nowIso)) };
  }

  // FIXED: valor mensal, sem fim.
  if (!Number.isInteger(p.amount) || p.amount <= 0) throw new Error("Valor inválido");
  const group = toGroup({ ...p, periodicity: "MONTHLY", interval_days: null }, p.amount, null);
  const transactions = fixedOccurrencesToCreate(group, [], today, makeId, nowIso, p.transaction_date);
  return { group, transactions };
}

function toGroup(p: NewTransactionGroup, total: number, count: number | null): InstallmentGroup {
  return {
    id: p.id,
    kind: p.kind,
    type: p.type,
    description: p.description.trim(),
    total_amount: total,
    installment_count: count,
    periodicity: p.periodicity,
    interval_days: p.periodicity === "CUSTOM" ? p.interval_days : null,
    payment_method: "CREDIT_CARD",
    first_due_date: p.first_due_date,
    scope: p.scope,
    category_id: p.category_id,
    active: true,
  };
}

/**
 * Cobranças fixas mensais que ainda faltam criar até o horizonte.
 * Idempotente: considera as já existentes do grupo (inclusive canceladas) pelo número.
 * Sempre garante pelo menos a primeira cobrança.
 */
export function fixedOccurrencesToCreate(
  group: InstallmentGroup,
  existing: Transaction[],
  today: ISODate,
  makeId: () => string,
  nowIso: string,
  transactionDate: ISODate = today,
): Transaction[] {
  if (group.kind !== "FIXED" || !group.active) return [];
  const until = addMonths(today, FIXED_HORIZON_MONTHS);
  const have = new Set(existing.filter((t) => t.installment_group_id === group.id).map((t) => t.installment_number));
  const out: Transaction[] = [];
  for (let n = 1; n <= 600; n++) {
    const date = occurrenceDate(group.first_due_date, n - 1, "MONTHLY");
    if (date > until && n > 1) break;
    if (!have.has(n)) out.push(occurrence(group, n, group.total_amount, transactionDate, makeId, nowIso));
  }
  return out;
}

/** Cobranças futuras pendentes de um grupo (canceladas ao encerrar uma fixa mensal). */
export function futurePendingOfGroup(groupId: string, transactions: Transaction[], today: ISODate): Transaction[] {
  return transactions.filter((t) => {
    if (t.installment_group_id !== groupId || t.status !== "PENDING") return false;
    const d = t.due_date ?? t.expected_date;
    return d !== null && d > today;
  });
}

/** Texto curto da periodicidade, ex.: "a cada 10 dias", "mensal". */
export function periodicityText(periodicity: Periodicity, intervalDays: number | null): string {
  if (periodicity === "CUSTOM") return intervalDays === 1 ? "todo dia" : `a cada ${intervalDays} dias`;
  return { DAILY: "diária", WEEKLY: "semanal", BIWEEKLY: "quinzenal", MONTHLY: "mensal", BIMONTHLY: "bimestral", QUARTERLY: "trimestral", SEMIANNUAL: "semestral", ANNUAL: "anual" }[periodicity];
}
