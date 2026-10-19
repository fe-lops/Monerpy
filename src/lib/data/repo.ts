import type {
  Category,
  InstallmentGroup,
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
  /** Grupos de cobrança no crédito (parcelado/repetido e fixa mensal). */
  groups: InstallmentGroup[];
}

export interface SessionInfo {
  userId: string;
  email: string | null;
}

/** Contrato de acesso a dados. Implementado por LocalRepo (navegador) e SupabaseRepo. */
export interface Repo {
  /** local = navegador; ghost = visitante em memória (/ghost-test-user); supabase = produção. */
  readonly mode: "local" | "ghost" | "supabase";

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
  /**
   * Cria o grupo e suas cobranças (geradas por lib/domain/recurrence.ts) de forma atômica e
   * idempotente: o mesmo group.id de novo não duplica nada. Retorna as cobranças do grupo.
   */
  createGroup(group: InstallmentGroup, transactions: Transaction[]): Promise<Transaction[]>;
  /** Insere cobranças geradas (fixa mensal); ignora as que já existem (mesmo grupo + número). */
  insertGenerated(transactions: Transaction[]): Promise<void>;
  /** Encerra uma cobrança fixa: desativa o grupo e cancela as cobranças futuras informadas. */
  endGroup(groupId: string, cancelTransactionIds: string[]): Promise<void>;

  setReminderStatus(transactionId: string, remindAt: string, status: ReminderStatus): Promise<Reminder>;

  /** Exclui a conta e todos os dados dela (Configurações → Excluir minha conta). Encerra a sessão. */
  deleteAccount(): Promise<void>;

  /** Apaga todos os dados do usuário (modo local) — usado em "Apagar dados". */
  resetAll?(): Promise<void>;
}

export function newId(): string {
  return crypto.randomUUID();
}
