import { describe, expect, it } from "vitest";
import { addMonths, todayISO } from "./dates";
import {
  availableBalance,
  bucketPending,
  isOverdue,
  pendingTotals,
  realizedInPeriod,
  splitInstallments,
  toCSV,
} from "./finance";
import { buildGroup } from "./recurrence";
import { centsToNumeric, maskBRLInput, numericToCents, parseBRL } from "./money";
import type { Transaction } from "./types";

const TODAY = "2026-10-15";
const profile = { opening_balance: 100000, opening_balance_date: "2026-10-01" };

let n = 0;
function tx(p: Partial<Transaction>): Transaction {
  return {
    id: `t${n++}`,
    category_id: null,
    installment_group_id: null,
    type: "INCOME",
    scope: "BUSINESS",
    status: "PENDING",
    description: "x",
    amount: 100,
    transaction_date: TODAY,
    due_date: null,
    expected_date: null,
    settled_at: null,
    payment_method: "UNSPECIFIED",
    installment_number: null,
    installment_count: null,
    notes: null,
    created_at: "2026-10-15T12:00:00Z",
    cancelled_at: null,
    ...p,
  };
}

describe("critérios de aceite do PRD (§11)", () => {
  it("saldo de R$ 1.000 + receita liquidada de R$ 100 = R$ 1.100", () => {
    const txs = [tx({ amount: 10000, status: "SETTLED", settled_at: TODAY, payment_method: "PIX" })];
    expect(availableBalance(profile, txs)).toBe(110000);
  });

  it("receita prevista aparece em a receber e não altera o saldo", () => {
    const txs = [tx({ amount: 10000, expected_date: "2026-10-20" })];
    expect(availableBalance(profile, txs)).toBe(100000);
    expect(pendingTotals(txs, TODAY).receivable).toBe(10000);
  });

  it("despesa paga de R$ 40 reduz o saldo uma única vez", () => {
    const txs = [tx({ type: "EXPENSE", amount: 4000, status: "SETTLED", settled_at: TODAY, payment_method: "PIX" })];
    expect(availableBalance(profile, txs)).toBe(96000);
  });

  it("despesa pendente aparece em a pagar sem alterar o saldo", () => {
    const txs = [tx({ type: "EXPENSE", amount: 4000, due_date: "2026-10-20" })];
    expect(availableBalance(profile, txs)).toBe(100000);
    expect(pendingTotals(txs, TODAY).payable).toBe(4000);
  });

  it("canceladas não afetam saldo nem pendências", () => {
    const txs = [
      tx({ type: "EXPENSE", amount: 4000, status: "CANCELLED", due_date: "2026-10-20" }),
      tx({ amount: 4000, status: "CANCELLED", settled_at: TODAY }),
    ];
    expect(availableBalance(profile, txs)).toBe(100000);
    expect(pendingTotals(txs, TODAY)).toMatchObject({ payable: 0, receivable: 0 });
  });

  it("liquidações anteriores à data de abertura não entram no saldo", () => {
    const txs = [tx({ amount: 5000, status: "SETTLED", settled_at: "2026-09-30" })];
    expect(availableBalance(profile, txs)).toBe(100000);
  });

  it("vencida aparece como atrasada; sem data aparece como sem data", () => {
    const late = tx({ type: "EXPENSE", due_date: "2026-10-10" });
    const noDate = tx({});
    expect(isOverdue(late, TODAY)).toBe(true);
    expect(isOverdue(noDate, TODAY)).toBe(false);
    const b = bucketPending([late, noDate], TODAY);
    expect(b.overdue).toHaveLength(1);
    expect(b.nodate).toHaveLength(1);
  });

  it("R$ 100 em 3 parcelas soma exatamente R$ 100, com ajuste na última", () => {
    expect(splitInstallments(10000, 3)).toEqual([3333, 3333, 3334]);
    const { transactions: parts } = buildGroup(
      {
        id: "g1",
        kind: "INSTALLMENT",
        type: "EXPENSE",
        description: "Notebook",
        amount: 10000,
        amount_mode: "TOTAL",
        installment_count: 3,
        periodicity: "MONTHLY",
        interval_days: null,
        first_due_date: "2026-01-31",
        scope: "PERSONAL",
        category_id: null,
        transaction_date: TODAY,
      },
      () => `p${n++}`,
      "2026-10-15T12:00:00Z",
      TODAY,
    );
    expect(parts.reduce((s, p) => s + p.amount, 0)).toBe(10000);
    expect(parts.map((p) => p.due_date)).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
    expect(parts.every((p) => p.status === "PENDING" && p.payment_method === "CREDIT_CARD")).toBe(true);
    expect(parts.map((p) => p.installment_number)).toEqual([1, 2, 3]);
  });

  it("período considera apenas liquidadas dentro do intervalo, por contexto", () => {
    const txs = [
      tx({ amount: 1000, status: "SETTLED", settled_at: "2026-10-02" }),
      tx({ amount: 500, status: "SETTLED", settled_at: "2026-10-03", scope: "PERSONAL" }),
      tx({ type: "EXPENSE", amount: 300, status: "SETTLED", settled_at: "2026-10-05" }),
      tx({ amount: 9999, status: "SETTLED", settled_at: "2026-11-01" }),
    ];
    expect(realizedInPeriod(txs, "2026-10-01", "2026-10-31")).toEqual({ income: 1500, expense: 300, net: 1200 });
    expect(realizedInPeriod(txs, "2026-10-01", "2026-10-31", "PERSONAL").income).toBe(500);
  });
});

describe("dinheiro e datas", () => {
  it("converte valores sem float", () => {
    expect(parseBRL("R$ 1.234,56")).toBe(123456);
    expect(maskBRLInput("12345").cents).toBe(12345);
    expect(centsToNumeric(123456)).toBe("1234.56");
    expect(centsToNumeric(5)).toBe("0.05");
    expect(numericToCents("1234.5")).toBe(123450);
    expect(numericToCents(0.1 + 0.2)).toBe(30);
  });

  it("soma de meses respeita fim de mês e virada de ano", () => {
    expect(addMonths("2026-12-15", 1)).toBe("2027-01-15");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
  });

  it("hoje é calculado no fuso de São Paulo", () => {
    // 02:00 UTC do dia 16 ainda é dia 15 em São Paulo (UTC-3).
    expect(todayISO("America/Sao_Paulo", new Date("2026-10-16T02:00:00Z"))).toBe("2026-10-15");
  });

  it("CSV usa ; e vírgula decimal", () => {
    const csv = toCSV([tx({ description: "Água; conta", amount: 12345 })], []);
    expect(csv).toContain('"Água; conta"');
    expect(csv).toContain("123,45");
  });
});
