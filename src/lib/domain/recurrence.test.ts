import { describe, expect, it } from "vitest";
import { buildGroup, fixedOccurrencesToCreate, futurePendingOfGroup, groupAmounts, occurrenceDate } from "./recurrence";
import type { NewTransactionGroup } from "./types";

const TODAY = "2026-10-16";
let n = 0;
const id = () => `id${n++}`;
const NOW = "2026-10-16T12:00:00Z";

function spec(p: Partial<NewTransactionGroup>): NewTransactionGroup {
  return {
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
    ...p,
  };
}

describe("periodicidade", () => {
  it("calcula datas por dias e por meses a partir da primeira", () => {
    expect(occurrenceDate("2026-01-31", 1, "MONTHLY")).toBe("2026-02-28");
    expect(occurrenceDate("2026-01-31", 2, "MONTHLY")).toBe("2026-03-31"); // sem acumular desvio
    expect(occurrenceDate("2026-10-16", 2, "WEEKLY")).toBe("2026-10-30");
    expect(occurrenceDate("2026-10-16", 1, "BIWEEKLY")).toBe("2026-10-31");
    expect(occurrenceDate("2026-10-16", 1, "QUARTERLY")).toBe("2027-01-16");
    expect(occurrenceDate("2026-10-16", 1, "ANNUAL")).toBe("2027-10-16");
    expect(occurrenceDate("2026-10-16", 3, "CUSTOM", 10)).toBe("2026-11-15");
  });

  it("personalizado exige intervalo", () => {
    expect(() => occurrenceDate("2026-10-16", 1, "CUSTOM", null)).toThrow();
  });
});

describe("parcelar ou repetir", () => {
  it("TOTAL divide exatamente; EACH repete o valor", () => {
    expect(groupAmounts(10000, 3, "TOTAL")).toEqual([3333, 3333, 3334]);
    expect(groupAmounts(5000, 4, "EACH")).toEqual([5000, 5000, 5000, 5000]);
  });

  it("gera N cobranças pendentes no crédito com a periodicidade escolhida", () => {
    const { group, transactions } = buildGroup(spec({ periodicity: "WEEKLY", first_due_date: "2026-10-16", amount: 5000, amount_mode: "EACH", installment_count: 3 }), id, NOW, TODAY);
    expect(group.total_amount).toBe(15000);
    expect(transactions.map((t) => t.due_date)).toEqual(["2026-10-16", "2026-10-23", "2026-10-30"]);
    expect(transactions.every((t) => t.status === "PENDING" && t.payment_method === "CREDIT_CARD")).toBe(true);
    expect(transactions[2].description).toBe("Notebook (3/3)");
  });

  it("entrada parcelada usa data prevista (expected_date)", () => {
    const { transactions } = buildGroup(spec({ type: "INCOME" }), id, NOW, TODAY);
    expect(transactions[0].expected_date).toBe("2026-01-31");
    expect(transactions[0].due_date).toBeNull();
  });
});

describe("fixa mensal", () => {
  const fixed = spec({ kind: "FIXED", amount: 3990, amount_mode: "EACH", installment_count: null, first_due_date: "2026-10-10", description: "Streaming" });

  it("gera do lançamento até 2 meses à frente, sem número total", () => {
    const { group, transactions } = buildGroup(fixed, id, NOW, TODAY);
    expect(group.installment_count).toBeNull();
    expect(transactions.map((t) => t.due_date)).toEqual(["2026-10-10", "2026-11-10", "2026-12-10"]);
    expect(transactions.every((t) => t.amount === 3990 && t.description === "Streaming")).toBe(true);
  });

  it("é idempotente e só completa o que falta quando o tempo passa", () => {
    const { group, transactions } = buildGroup(fixed, id, NOW, TODAY);
    expect(fixedOccurrencesToCreate(group, transactions, TODAY, id, NOW)).toHaveLength(0);
    const later = fixedOccurrencesToCreate(group, transactions, "2026-12-20", id, NOW);
    expect(later.map((t) => t.installment_number)).toEqual([4, 5]); // jan e fev
  });

  it("grupo encerrado não gera novas cobranças; futuras pendentes são identificadas", () => {
    const { group, transactions } = buildGroup(fixed, id, NOW, TODAY);
    expect(fixedOccurrencesToCreate({ ...group, active: false }, [], "2027-06-01", id, NOW)).toHaveLength(0);
    expect(futurePendingOfGroup(group.id, transactions, TODAY).map((t) => t.due_date)).toEqual(["2026-11-10", "2026-12-10"]);
  });
});
