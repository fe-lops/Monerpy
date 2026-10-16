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
  /** Pode aprovar/recusar pedidos de registro. Definido só pelo banco (não editável pelo app). */
  is_admin: boolean;
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

/** Frequência das cobranças de um grupo (parcelas ou repetição). CUSTOM usa `interval_days`. */
export type Periodicity = "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "BIMONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "ANNUAL" | "CUSTOM";

/**
 * Tipo de grupo no crédito:
 *  - INSTALLMENT: N cobranças (parcelar ou repetir), com periodicidade.
 *  - FIXED: cobrança fixa mensal sem fim; o app gera as próximas enquanto `active`.
 */
export type GroupKind = "INSTALLMENT" | "FIXED";

/** Grupo de cobranças no cartão de crédito. Cada cobrança é uma Transaction separada. */
export interface InstallmentGroup {
  id: string;
  kind: GroupKind;
  type: TxType;
  description: string;
  /** INSTALLMENT: soma das cobranças. FIXED: valor de cada mês. Em centavos. */
  total_amount: number;
  /** null em FIXED (sem fim). */
  installment_count: number | null;
  periodicity: Periodicity;
  /** Só em CUSTOM: intervalo em dias. */
  interval_days: number | null;
  payment_method: PaymentMethod;
  first_due_date: ISODate;
  scope: Scope;
  category_id: string | null;
  /** FIXED encerrada = false (não gera novas cobranças). */
  active: boolean;
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

export const PERIODICITY_LABEL: Record<Periodicity, string> = {
  DAILY: "Diário",
  WEEKLY: "Semanal",
  BIWEEKLY: "Quinzenal",
  MONTHLY: "Mensal",
  BIMONTHLY: "Bimestral",
  QUARTERLY: "Trimestral",
  SEMIANNUAL: "Semestral",
  ANNUAL: "Anual",
  CUSTOM: "Personalizado",
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

/** Dados para criar um grupo de cobranças no crédito (parcelado/repetido ou fixo mensal). */
export interface NewTransactionGroup {
  id: string; // gerado no cliente: torna a criação idempotente
  kind: GroupKind;
  type: TxType;
  description: string;
  /** Valor digitado, em centavos. Ver `amount_mode`. */
  amount: number;
  /** INSTALLMENT: "TOTAL" divide o valor entre as cobranças; "EACH" repete o valor em cada uma. FIXED: sempre "EACH". */
  amount_mode: "TOTAL" | "EACH";
  installment_count: number | null;
  periodicity: Periodicity;
  interval_days: number | null;
  first_due_date: ISODate;
  scope: Scope;
  category_id: string | null;
  transaction_date: ISODate;
}

export type RegistrationStatus = "PENDING" | "APPROVED" | "REJECTED";

/** Pedido de acesso de uma nova usuária, aprovado ou recusado por um administrador. */
export interface RegistrationRequest {
  id: string;
  email: string;
  status: RegistrationStatus;
  note: string | null;
  created_at: string;
  decided_at: string | null;
}
