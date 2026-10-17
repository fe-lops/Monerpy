import { describe, expect, it } from "vitest";
import { findOtherCategory, selectableCategories } from "./categories";
import type { Category } from "./types";

const cat = (id: string, name: string, transaction_type: Category["transaction_type"], is_archived = false): Category => ({
  id,
  name,
  transaction_type,
  default_scope: "PERSONAL",
  is_archived,
});

const list = [
  cat("1", "Supermercado & Feira", "EXPENSE"),
  cat("2", "Outros", "EXPENSE"),
  cat("3", "Aluguel & Condomínio", "EXPENSE"),
  cat("4", "Outros", "INCOME"),
  cat("5", "Pets", "EXPENSE", true),
];

describe("categoria Outros", () => {
  it("encontra a Outros do tipo certo", () => {
    expect(findOtherCategory(list, "EXPENSE")?.id).toBe("2");
    expect(findOtherCategory(list, "INCOME")?.id).toBe("4");
  });

  it("ignora a Outros arquivada", () => {
    expect(findOtherCategory([cat("9", "Outros", "EXPENSE", true)], "EXPENSE")).toBeUndefined();
  });

  it("lista ativas do tipo em ordem alfabética, com Outros por último", () => {
    expect(selectableCategories(list, "EXPENSE").map((c) => c.name)).toEqual(["Aluguel & Condomínio", "Supermercado & Feira", "Outros"]);
  });

  it("mantém a categoria arquivada de um lançamento em edição", () => {
    expect(selectableCategories(list, "EXPENSE", "5").map((c) => c.id)).toContain("5");
  });
});
