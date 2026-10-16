// Tipos de domínio. Valores em dinheiro ficam em CENTAVOS (inteiros) dentro do app;
// a conversão para NUMERIC(14,2) acontece só na fronteira com o banco.

export type TxType = "INCOME" | "EXPENSE";
export type Scope = "BUSINESS" | "PERSONAL";
export type TxStatus = "PENDING" | "SETTLED" | "CANCELLED";
export type PaymentMethod = "PIX" | "DEBIT_CARD" | "CREDIT_CARD" | "UNSPECIFIED";
export type ReminderStatus = "PENDING" | "SEEN" | "DONE" | "CANCELLED";

/** Data no formato YYYY-MM-DD. */
export type ISODate = string;

export interface Profile {
  user_id: string;
  display_name: string;
  opening_balance: number; // centavos
  opening_balance_date: ISODate;
  timezone: string;
  onboarded: boolean;
}

export interface Category {
  id: string;
  name: string;
  transaction_type: TxType;
  default_scope: Scope;
  is_archived: boolean;
}

export interface Transaction {
  id: string;
  category_id: string | null;
  installment_group_id: string | null;
  type: TxType;
  scope: Scope;
  status: TxStatus;
  description: string;
  amount: number; // centavos, sempre > 0
  transaction_date: ISODate;
  due_date: ISODate | null;
  expected_date: ISODate | null;
  /** Data efetiva do pagamento/recebimento (YYYY-MM-DD). */
  settled_at: ISODate | null;
  payment_method: PaymentMethod;
  installment_number: number | null;
  installment_count: number | null;
  notes: string | null;
  created_at: string;
  cancelled_at: string | null;
}

export interface InstallmentGroup {
  id: string;
  description: string;
  total_amount: number; // centavos
  installment_count: number;
  payment_method: PaymentMethod;
  first_due_date: ISODate;
  scope: Scope;
  category_id: string | null;
}

export interface Reminder {
  id: string;
  transaction_id: string | null;
  remind_at: string;
  status: ReminderStatus;
  channel: "IN_APP";
}

export type ScopeFilter = Scope | "ALL";

export const SCOPE_LABEL: Record<Scope, string> = {
  BUSINESS: "Profissional",
  PERSONAL: "Pessoal",
};

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  PIX: "Pix",
  DEBIT_CARD: "Cartão de débito",
  CREDIT_CARD: "Cartão de crédito",
  UNSPECIFIED: "A definir",
};

export const STATUS_LABEL: Record<TxStatus, string> = {
  PENDING: "Pendente",
  SETTLED: "Liquidado",
  CANCELLED: "Cancelado",
};

/** Dados para criar uma movimentação simples. */
export type NewTransaction = Omit<
  Transaction,
  "id" | "created_at" | "cancelled_at" | "installment_group_id" | "installment_number" | "installment_count"
>;

/** Dados para criar uma compra parcelada no cartão. */
export interface NewInstallmentPurchase {
  id: string; // gerado no cliente: torna a criação idempotente
  description: string;
  total_amount: number;
  installment_count: number;
  first_due_date: ISODate;
  scope: Scope;
  category_id: string | null;
  transaction_date: ISODate;
}
