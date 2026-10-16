import { addDays } from "../domain/dates";
import type { Category, NewInstallmentPurchase, Scope, Transaction, TxType } from "../domain/types";

/** Categorias iniciais (PRD §7). Editáveis; o mesmo conjunto é criado pelo SQL no Supabase. */
export const DEFAULT_CATEGORIES: { name: string; transaction_type: TxType; default_scope: Scope }[] = [
  { name: "Receita de atendimento", transaction_type: "INCOME", default_scope: "BUSINESS" },
  { name: "Produtos", transaction_type: "EXPENSE", default_scope: "BUSINESS" },
  { name: "Gasolina/Deslocamento", transaction_type: "EXPENSE", default_scope: "BUSINESS" },
  { name: "Outras despesas profissionais", transaction_type: "EXPENSE", default_scope: "BUSINESS" },
  { name: "Outras receitas", transaction_type: "INCOME", default_scope: "PERSONAL" },
  { name: "Água", transaction_type: "EXPENSE", default_scope: "PERSONAL" },
  { name: "Luz", transaction_type: "EXPENSE", default_scope: "PERSONAL" },
  { name: "Internet", transaction_type: "EXPENSE", default_scope: "PERSONAL" },
  { name: "Gás", transaction_type: "EXPENSE", default_scope: "PERSONAL" },
  { name: "Seguro do carro", transaction_type: "EXPENSE", default_scope: "PERSONAL" },
  { name: "Cartão de crédito", transaction_type: "EXPENSE", default_scope: "PERSONAL" },
  { name: "Outras despesas pessoais", transaction_type: "EXPENSE", default_scope: "PERSONAL" },
];

/** Movimentações de exemplo para demonstrar o app no modo local. */
export function demoTransactions(categories: Category[], today: string, makeId: () => string): Transaction[] {
  const cat = (name: string) => categories.find((c) => c.name === name)?.id ?? null;
  const now = new Date().toISOString();
  const base = {
    installment_group_id: null,
    installment_number: null,
    installment_count: null,
    notes: null,
    created_at: now,
    cancelled_at: null,
  };
  const settled = (type: TxType, scope: Scope, description: string, category: string, amount: number, daysAgo: number, method: Transaction["payment_method"]): Transaction => ({
    ...base,
    id: makeId(),
    category_id: cat(category),
    type,
    scope,
    status: "SETTLED",
    description,
    amount,
    transaction_date: addDays(today, -daysAgo),
    due_date: type === "EXPENSE" ? addDays(today, -daysAgo) : null,
    expected_date: type === "INCOME" ? addDays(today, -daysAgo) : null,
    settled_at: addDays(today, -daysAgo),
    payment_method: method,
  });
  const pending = (type: TxType, scope: Scope, description: string, category: string, amount: number, inDays: number | null): Transaction => ({
    ...base,
    id: makeId(),
    category_id: cat(category),
    type,
    scope,
    status: "PENDING",
    description,
    amount,
    transaction_date: today,
    due_date: type === "EXPENSE" && inDays !== null ? addDays(today, inDays) : null,
    expected_date: type === "INCOME" && inDays !== null ? addDays(today, inDays) : null,
    settled_at: null,
    payment_method: "UNSPECIFIED",
  });

  const list: Transaction[] = [
    settled("INCOME", "BUSINESS", "Atendimento — Ana", "Receita de atendimento", 18000, 1, "PIX"),
    settled("INCOME", "BUSINESS", "Atendimento — Carla", "Receita de atendimento", 25000, 3, "CREDIT_CARD"),
    settled("EXPENSE", "BUSINESS", "Reposição de produtos", "Produtos", 32050, 4, "DEBIT_CARD"),
    settled("EXPENSE", "BUSINESS", "Gasolina", "Gasolina/Deslocamento", 15000, 6, "PIX"),
    settled("INCOME", "BUSINESS", "Atendimento — Juliana", "Receita de atendimento", 22000, 8, "PIX"),
    settled("EXPENSE", "PERSONAL", "Conta de luz", "Luz", 13800, 7, "PIX"),
    settled("EXPENSE", "PERSONAL", "Internet fibra", "Internet", 9990, 9, "DEBIT_CARD"),
    settled("EXPENSE", "PERSONAL", "Botijão de gás", "Gás", 11000, 12, "PIX"),
    settled("EXPENSE", "BUSINESS", "Gasolina", "Gasolina/Deslocamento", 12000, 35, "PIX"),
    settled("INCOME", "BUSINESS", "Atendimento — Patrícia", "Receita de atendimento", 30000, 38, "PIX"),
    pending("INCOME", "BUSINESS", "Atendimento — Beatriz", "Receita de atendimento", 20000, 2),
    pending("INCOME", "BUSINESS", "Atendimento — Fernanda", "Receita de atendimento", 18000, 6),
    pending("INCOME", "BUSINESS", "Atendimento — Marina", "Receita de atendimento", 15000, null),
    pending("EXPENSE", "PERSONAL", "Conta de água", "Água", 8540, -2),
    pending("EXPENSE", "PERSONAL", "Seguro do carro", "Seguro do carro", 21000, 0),
    pending("EXPENSE", "BUSINESS", "Pedido de produtos", "Produtos", 27000, 10),
  ];
  return list;
}

/** Compra parcelada de exemplo (passa pelo mesmo fluxo de parcelamento do app). */
export function demoInstallment(categories: Category[], today: string, makeId: () => string): NewInstallmentPurchase {
  return {
    id: makeId(),
    description: "Secador profissional",
    total_amount: 60000,
    installment_count: 3,
    first_due_date: addDays(today, 5),
    scope: "BUSINESS",
    category_id: categories.find((c) => c.name === "Outras despesas profissionais")?.id ?? null,
    transaction_date: today,
  };
}
