import { describe, expect, it } from "vitest";
import { sameDayInMonth } from "./dates";
import { descriptionSuggestions, stripInstallmentSuffix } from "./suggestions";
import type { Transaction } from "./types";

let n = 0;
function tx(p: Partial<Transaction>): Transaction {
  return {
    id: `t${n++}`,
    category_id: null,
    installment_group_id: null,
    type: "EXPENSE",
    scope: "PERSONAL",
    status: "SETTLED",
    description: "x",
    amount: 100,
    transaction_date: "2026-08-10",
    due_date: null,
    expected_date: null,
    settled_at: "2026-08-10",
    payment_method: "PIX",
    installment_number: null,
    installment_count: null,
    notes: null,
    created_at: "2026-08-10T12:00:00Z",
    cancelled_at: null,
    ...p,
  };
}

describe("sugestões de descrição", () => {
  const agosto = tx({ description: "Conta de Água Cesan", amount: 8900, transaction_date: "2026-08-10" });
  const julho = tx({ description: "Conta de Água Cesan", amount: 7500, transaction_date: "2026-07-10" });
  const luz = tx({ description: "Conta de luz", transaction_date: "2026-09-05" });
  const mercado = tx({ description: "Mercado — conta conjunta", transaction_date: "2026-09-20" });
  const cancelada = tx({ description: "Conta cancelada", status: "CANCELLED" });
  const entrada = tx({ description: "Consulta", type: "INCOME" });
  const all = [julho, agosto, luz, mercado, cancelada, entrada];

  it("sugere pelo começo do nome, sem acento nem maiúscula, um item por nome (o mais recente)", () => {
    const list = descriptionSuggestions(all, [], "CON", "EXPENSE");
    expect(list.map((s) => s.description)).toEqual(["Conta de luz", "Conta de Água Cesan", "Mercado — conta conjunta"]);
    expect(list[1].tx.amount).toBe(8900); // agosto, não julho
    expect(descriptionSuggestions(all, [], "agua", "EXPENSE")[0].description).toBe("Conta de Água Cesan");
  });

  it("ignora o outro tipo, os cancelados e textos curtos", () => {
    expect(descriptionSuggestions(all, [], "Consulta", "EXPENSE")).toEqual([]);
    expect(descriptionSuggestions(all, [], "c", "EXPENSE")).toEqual([]);
    expect(descriptionSuggestions(all, [], "conta c", "EXPENSE").map((s) => s.description)).toEqual(["Mercado — conta conjunta"]);
    expect(descriptionSuggestions(all, [], "ont", "EXPENSE")).toEqual([]); // só início de palavra
  });

  it("parcelas viram uma sugestão só, sem o (n/N)", () => {
    const parcelas = [1, 2, 3].map((i) => tx({ description: `Notebook (${i}/3)`, installment_group_id: "g1", installment_number: i }));
    const list = descriptionSuggestions(parcelas, [], "note", "EXPENSE");
    expect(list).toHaveLength(1);
    expect(list[0].description).toBe("Notebook");
    expect(stripInstallmentSuffix("Curso (10/12)")).toBe("Curso");
  });
});

describe("sameDayInMonth", () => {
  it("leva o dia para outro mês, limitado ao último dia", () => {
    expect(sameDayInMonth("2026-08-10", "2026-10-19")).toBe("2026-10-10");
    expect(sameDayInMonth("2026-01-31", "2026-02-01")).toBe("2026-02-28");
  });
});
