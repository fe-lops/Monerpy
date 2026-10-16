// Dados iniciais: categorias padrão e o conjunto de exemplo (modo local e usuário fantasma).
//
// ⚠️ Ao criar uma funcionalidade nova, inclua um exemplo dela em `buildDemoData`:
// é o que o visitante de /ghost-test-user vê.

import { addDays, addMonths } from "../domain/dates";
import { buildGroup } from "../domain/recurrence";
import type { Category, InstallmentGroup, NewTransactionGroup, PaymentMethod, Scope, Transaction, TxType } from "../domain/types";

const income = (name: string) => ({ name, transaction_type: "INCOME" as TxType, default_scope: "PERSONAL" as Scope });
const expense = (name: string) => ({ name, transaction_type: "EXPENSE" as TxType, default_scope: "PERSONAL" as Scope });

/**
 * Categorias padrão: lista única (sem divisão profissional/pessoal), separada só por Entrada/Saída.
 * Mantenha igual a `default_category_seed()` na migration 20261017000000.
 */
export const DEFAULT_CATEGORIES: { name: string; transaction_type: TxType; default_scope: Scope }[] = [
  ...[
    "Salário / Pró-Labore",
    "Freelance / Serviços Prestados",
    "Dividendos / Proventos",
    "Rendimento de Renda Fixa",
    "Aluguéis Recebidos",
    "Venda de Bens",
    "Cashback & Bônus",
    "Reembolsos & Estornos",
    "Presentes & Doações Recebidas",
    "Empréstimos Recebidos",
  ].map(income),
  ...[
    "Aluguel & Condomínio",
    "Financiamento Imobiliário",
    "Contas de Consumo",
    "Internet & Telefonia",
    "Manutenção & Reformas",
    "Móveis & Eletrodomésticos",
    "Limpeza & Organização",
    "IPTU & Taxas Municipais",
    "Serviços Domésticos",
    "Seguro Residencial",
    "Supermercado & Feira",
    "Restaurantes & Bares",
    "Delivery & Apps de Comida",
    "Cafeterias & Lanches",
    "Padaria & Conveniência",
    "Combustível",
    "Transporte Público",
    "Transporte por App & Táxi",
    "Manutenção do Veículo",
    "IPVA, Licenciamento & Seguros",
    "Estacionamento & Pedágios",
    "Plano de Saúde & Odontológico",
    "Farmácia & Medicamentos",
    "Consultas & Exames",
    "Academia & Esportes",
    "Cuidados Pessoais & Estética",
    "Assinaturas & Streaming",
    "Jogos & Software",
    "Cinema, Shows & Eventos",
    "Viagens & Hospedagem",
    "Roupas & Acessórios",
    "Cursos & Certificações",
    "Livros & Material Didático",
    "Pets",
    "Presentes & Doações",
    "Aportes em Investimentos",
    "Reserva de Emergência",
    "Tarifas Bancárias & Anuidade",
    "Pagamento de Dívidas & Juros",
    "Impostos & Contribuições",
  ].map(expense),
];

/**
 * Conjunto de exemplo com todas as funcionalidades: histórico para os gráficos, pendências
 * (atrasada, hoje, futuras, sem data), crédito não recorrente, parcelado mensal e semanal,
 * entrada parcelada e cobranças fixas mensais.
 */
export function buildDemoData(categories: Category[], today: string, makeId: () => string): { transactions: Transaction[]; groups: InstallmentGroup[] } {
  const cat = (name: string) => categories.find((c) => c.name === name)?.id ?? null;
  const now = new Date().toISOString();
  const base = { installment_group_id: null, installment_number: null, installment_count: null, notes: null, created_at: now, cancelled_at: null };

  const settled = (type: TxType, scope: Scope, description: string, category: string, amount: number, daysAgo: number, method: PaymentMethod): Transaction => ({
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

  const transactions: Transaction[] = [
    // Entradas recebidas (três meses, para os gráficos)
    settled("INCOME", "BUSINESS", "Atendimento — Ana", "Freelance / Serviços Prestados", 18000, 1, "PIX"),
    settled("INCOME", "BUSINESS", "Atendimento — Carla", "Freelance / Serviços Prestados", 25000, 3, "CREDIT_CARD"),
    settled("INCOME", "BUSINESS", "Atendimento — Juliana", "Freelance / Serviços Prestados", 22000, 8, "PIX"),
    settled("INCOME", "PERSONAL", "Cashback do cartão", "Cashback & Bônus", 3250, 12, "PIX"),
    settled("INCOME", "BUSINESS", "Atendimento — Patrícia", "Freelance / Serviços Prestados", 30000, 35, "PIX"),
    settled("INCOME", "PERSONAL", "Pró-labore", "Salário / Pró-Labore", 150000, 32, "PIX"),
    settled("INCOME", "BUSINESS", "Atendimento — Bruna", "Freelance / Serviços Prestados", 28000, 63, "DEBIT_CARD"),
    settled("INCOME", "PERSONAL", "Pró-labore", "Salário / Pró-Labore", 150000, 62, "PIX"),
    // Saídas pagas
    settled("EXPENSE", "PERSONAL", "Supermercado do mês", "Supermercado & Feira", 32050, 4, "DEBIT_CARD"),
    settled("EXPENSE", "BUSINESS", "Gasolina", "Combustível", 15000, 6, "PIX"),
    settled("EXPENSE", "PERSONAL", "Conta de luz", "Contas de Consumo", 13800, 7, "PIX"),
    settled("EXPENSE", "PERSONAL", "Internet fibra", "Internet & Telefonia", 9990, 9, "DEBIT_CARD"),
    settled("EXPENSE", "PERSONAL", "Jantar", "Restaurantes & Bares", 8600, 3, "CREDIT_CARD"),
    settled("EXPENSE", "PERSONAL", "Tênis de corrida", "Roupas & Acessórios", 25990, 5, "CREDIT_CARD"), // crédito não recorrente
    settled("EXPENSE", "PERSONAL", "Farmácia", "Farmácia & Medicamentos", 4590, 11, "PIX"),
    settled("EXPENSE", "BUSINESS", "Gasolina", "Combustível", 12000, 35, "PIX"),
    settled("EXPENSE", "PERSONAL", "Aluguel", "Aluguel & Condomínio", 90000, 33, "PIX"),
    settled("EXPENSE", "PERSONAL", "Delivery", "Delivery & Apps de Comida", 5200, 40, "CREDIT_CARD"),
    settled("EXPENSE", "PERSONAL", "Aluguel", "Aluguel & Condomínio", 90000, 63, "PIX"),
    settled("EXPENSE", "PERSONAL", "Supermercado do mês", "Supermercado & Feira", 29870, 64, "DEBIT_CARD"),
    // Pendências
    pending("INCOME", "BUSINESS", "Atendimento — Beatriz", "Freelance / Serviços Prestados", 20000, 2),
    pending("INCOME", "BUSINESS", "Atendimento — Fernanda", "Freelance / Serviços Prestados", 18000, 6),
    pending("INCOME", "BUSINESS", "Atendimento — Marina", "Freelance / Serviços Prestados", 15000, null),
    pending("EXPENSE", "PERSONAL", "Conta de água", "Contas de Consumo", 8540, -2),
    pending("EXPENSE", "PERSONAL", "IPVA (cota única)", "IPVA, Licenciamento & Seguros", 21000, 0),
    pending("EXPENSE", "BUSINESS", "Curso de colorimetria", "Cursos & Certificações", 27000, 10),
  ];

  const spec = (p: Omit<NewTransactionGroup, "id" | "transaction_date" | "interval_days"> & { interval_days?: number | null }): NewTransactionGroup => ({
    id: makeId(),
    transaction_date: today,
    interval_days: null,
    ...p,
  });
  const specs: NewTransactionGroup[] = [
    // Parcelado mensal (valor total dividido)
    spec({ kind: "INSTALLMENT", type: "EXPENSE", description: "Secador profissional", amount: 60000, amount_mode: "TOTAL", installment_count: 3, periodicity: "MONTHLY", first_due_date: addDays(today, 5), scope: "BUSINESS", category_id: cat("Móveis & Eletrodomésticos") }),
    // Repetir semanal (mesmo valor em cada cobrança)
    spec({ kind: "INSTALLMENT", type: "EXPENSE", description: "Aulas de inglês", amount: 8000, amount_mode: "EACH", installment_count: 4, periodicity: "WEEKLY", first_due_date: addDays(today, 1), scope: "PERSONAL", category_id: cat("Cursos & Certificações") }),
    // Entrada parcelada no crédito (cliente pagou em 3x na maquininha)
    spec({ kind: "INSTALLMENT", type: "INCOME", description: "Pacote de atendimentos — Lúcia", amount: 90000, amount_mode: "TOTAL", installment_count: 3, periodicity: "MONTHLY", first_due_date: addDays(today, 10), scope: "BUSINESS", category_id: cat("Freelance / Serviços Prestados") }),
    // Fixas mensais (a primeira já venceu e foi paga)
    spec({ kind: "FIXED", type: "EXPENSE", description: "Streaming", amount: 3990, amount_mode: "EACH", installment_count: null, periodicity: "MONTHLY", first_due_date: addMonths(addDays(today, -6), -1), scope: "PERSONAL", category_id: cat("Assinaturas & Streaming") }),
    spec({ kind: "FIXED", type: "EXPENSE", description: "Academia", amount: 9900, amount_mode: "EACH", installment_count: null, periodicity: "MONTHLY", first_due_date: addDays(today, 3), scope: "PERSONAL", category_id: cat("Academia & Esportes") }),
  ];

  const groups: InstallmentGroup[] = [];
  for (const s of specs) {
    const built = buildGroup(s, makeId, now, today);
    groups.push(built.group);
    for (const t of built.transactions) {
      const d = t.due_date ?? t.expected_date;
      // Cobranças que já venceram no exemplo aparecem como pagas.
      transactions.push(d && d < today ? { ...t, status: "SETTLED", settled_at: d } : t);
    }
  }
  return { transactions, groups };
}
