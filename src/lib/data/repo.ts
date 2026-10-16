import type {
  Category,
  NewInstallmentPurchase,
  NewTransaction,
  Profile,
  Reminder,
  ReminderStatus,
  Transaction,
} from "../domain/types";

export interface Snapshot {
  profile: Profile;
  categories: Category[];
  transactions: Transaction[];
  reminders: Reminder[];
}

export interface SessionInfo {
  userId: string;
  email: string | null;
}

/** Contrato de acesso a dados. Implementado por LocalRepo (navegador) e SupabaseRepo. */
export interface Repo {
  readonly mode: "local" | "supabase";

  getSession(): Promise<SessionInfo | null>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string, redirectTo: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  /** Token da sessão, enviado às rotas /api do servidor (Authorization: Bearer). */
  getAccessToken(): Promise<string | null>;
  /** Abre a sessão a partir do link de e-mail (convite de registro aprovado / magic link). */
  verifyEmailToken(tokenHash: string, type: "invite" | "magiclink" | "recovery"): Promise<void>;

  load(): Promise<Snapshot>;
  updateProfile(patch: Partial<Omit<Profile, "user_id">>): Promise<Profile>;

  createCategory(c: Omit<Category, "id" | "is_archived">): Promise<Category>;
  updateCategory(id: string, patch: Partial<Omit<Category, "id">>): Promise<Category>;

  createTransaction(t: NewTransaction & { id: string }): Promise<Transaction>;
  updateTransaction(id: string, patch: Partial<Omit<Transaction, "id" | "created_at">>): Promise<Transaction>;
  /** Cria grupo + parcelas de forma atômica e idempotente (mesmo id = sem duplicar). */
  createInstallmentPurchase(p: NewInstallmentPurchase): Promise<Transaction[]>;

  setReminderStatus(transactionId: string, remindAt: string, status: ReminderStatus): Promise<Reminder>;

  /** Apaga todos os dados do usuário (modo local) — usado em "Apagar dados". */
  resetAll?(): Promise<void>;
}

export function newId(): string {
  return crypto.randomUUID();
}
