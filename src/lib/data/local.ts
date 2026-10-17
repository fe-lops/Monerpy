// Repositório sem servidor, com dois "depósitos":
//  - browserStore: localStorage (modo local: desenvolver/demonstrar antes do Supabase).
//  - memoryStore: só na memória (usuário fantasma /ghost-test-user: nada é salvo; recarregar zera).

import { findOtherCategory, OTHER_CATEGORY_NAME } from "../domain/categories";
import { addMonths, DEFAULT_TZ, todayISO } from "../domain/dates";
import type { Category, InstallmentGroup, Profile, Reminder, Transaction } from "../domain/types";
import { newId, type Repo, type SessionInfo, type Snapshot } from "./repo";
import { buildDemoData, DEFAULT_CATEGORIES } from "./seed";

const DB_KEY = "monerpy:db:v1";
const SESSION_KEY = "monerpy:local-session";
const LOCAL_USER = "local-user";

export type LocalDB = Snapshot;

export interface LocalStore {
  read(): LocalDB | null;
  write(db: LocalDB): void;
}

export function freshDB(): LocalDB {
  return {
    profile: {
      user_id: LOCAL_USER,
      display_name: "",
      opening_balance: 0,
      opening_balance_date: todayISO(),
      timezone: DEFAULT_TZ,
      onboarded: false,
      is_admin: false,
    },
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c, id: newId(), is_archived: false })),
    transactions: [],
    reminders: [],
    groups: [],
  };
}

/** Banco já preenchido com o conjunto de exemplo (usuário fantasma e "dados de exemplo"). */
export function demoDB(displayName: string): LocalDB {
  const db = freshDB();
  const today = todayISO(db.profile.timezone);
  const demo = buildDemoData(db.categories, today, newId);
  db.transactions = demo.transactions;
  db.groups = demo.groups;
  db.profile = { ...db.profile, display_name: displayName, opening_balance: 250000, opening_balance_date: addMonths(today, -3), onboarded: true };
  return db;
}

export const browserStore: LocalStore = {
  read() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (!raw) return null;
      const db = JSON.parse(raw) as LocalDB;
      db.groups = (db.groups ?? []).map(upgradeGroup); // bancos salvos por versões antigas
      ensureOtherCategories(db); // "Outros" chegou na v0.7.1
      return db;
    } catch {
      return null; // dados corrompidos ou armazenamento bloqueado: recomeça
    }
  },
  write(db) {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch {
      throw new Error("Não foi possível salvar neste navegador (armazenamento cheio ou bloqueado).");
    }
  },
};

/** Depósito em memória: começa em `seed()` a cada carregamento da página. */
export function memoryStore(seed: () => LocalDB): LocalStore {
  let db: LocalDB | null = null;
  return {
    read: () => (db ??= seed()),
    write: (next) => {
      db = next;
    },
  };
}

/** Garante a categoria "Outros" para Entrada e Saída (bancos salvos antes da v0.7.1). */
function ensureOtherCategories(db: LocalDB) {
  for (const type of ["INCOME", "EXPENSE"] as const) {
    if (!findOtherCategory(db.categories, type))
      db.categories.push({ id: newId(), name: OTHER_CATEGORY_NAME, transaction_type: type, default_scope: "PERSONAL", is_archived: false });
  }
}

/** Grupos salvos antes da v0.6.0 não tinham kind/type/periodicity. */
function upgradeGroup(g: InstallmentGroup): InstallmentGroup {
  return { ...g, kind: g.kind ?? "INSTALLMENT", type: g.type ?? "EXPENSE", periodicity: g.periodicity ?? "MONTHLY", interval_days: g.interval_days ?? null, active: g.active ?? true };
}

function mustFind<T extends { id: string }>(list: T[], id: string, what: string): T {
  const item = list.find((x) => x.id === id);
  if (!item) throw new Error(`${what} não encontrado(a).`);
  return item;
}

export class LocalRepo implements Repo {
  constructor(
    private store: LocalStore = browserStore,
    readonly mode: "local" | "ghost" = "local",
  ) {}

  private read(): LocalDB {
    const db = this.store.read();
    if (db) return db;
    const fresh = freshDB();
    this.store.write(fresh);
    return fresh;
  }

  private mutate<T>(fn: (db: LocalDB) => T): T {
    const db = this.read();
    const out = fn(db);
    this.store.write(db);
    return structuredClone(out);
  }

  async getSession(): Promise<SessionInfo | null> {
    if (this.mode === "ghost") return { userId: LOCAL_USER, email: null };
    try {
      return localStorage.getItem(SESSION_KEY) ? { userId: LOCAL_USER, email: null } : null;
    } catch {
      return null;
    }
  }
  async signIn() {
    if (this.mode === "local") localStorage.setItem(SESSION_KEY, "1");
  }
  async signOut() {
    if (this.mode === "local") localStorage.removeItem(SESSION_KEY);
  }
  async requestPasswordReset() {
    throw new Error("Recuperação de senha só funciona com o Supabase configurado.");
  }
  async getAccessToken() {
    return null;
  }
  async verifyEmailToken() {
    throw new Error("Links de e-mail só funcionam com o Supabase configurado.");
  }
  async updatePassword() {
    throw new Error("Troca de senha só funciona com o Supabase configurado.");
  }

  async load(): Promise<Snapshot> {
    return structuredClone(this.read());
  }

  async updateProfile(patch: Partial<Omit<Profile, "user_id">>) {
    return this.mutate((db) => Object.assign(db.profile, patch));
  }

  async createCategory(c: Omit<Category, "id" | "is_archived">) {
    return this.mutate((db) => {
      const exists = db.categories.some((x) => x.name.trim().toLowerCase() === c.name.trim().toLowerCase() && x.transaction_type === c.transaction_type);
      if (exists) throw new Error("Já existe uma categoria com esse nome.");
      const cat: Category = { ...c, id: newId(), is_archived: false };
      db.categories.push(cat);
      return cat;
    });
  }

  async updateCategory(id: string, patch: Partial<Omit<Category, "id">>) {
    return this.mutate((db) => Object.assign(mustFind(db.categories, id, "Categoria"), patch));
  }

  async createTransaction(t: Parameters<Repo["createTransaction"]>[0]) {
    return this.mutate((db) => {
      const existing = db.transactions.find((x) => x.id === t.id);
      if (existing) return existing; // idempotente: clique duplo não duplica
      const tx: Transaction = {
        ...t,
        installment_group_id: null,
        installment_number: null,
        installment_count: null,
        created_at: new Date().toISOString(),
        cancelled_at: null,
      };
      db.transactions.push(tx);
      return tx;
    });
  }

  async updateTransaction(id: string, patch: Partial<Omit<Transaction, "id" | "created_at">>) {
    return this.mutate((db) => Object.assign(mustFind(db.transactions, id, "Movimentação"), patch));
  }

  async createGroup(group: InstallmentGroup, transactions: Transaction[]) {
    return this.mutate((db) => {
      if (!db.groups.some((g) => g.id === group.id)) {
        db.groups.push(group);
        db.transactions.push(...transactions);
      }
      return db.transactions.filter((t) => t.installment_group_id === group.id);
    });
  }

  async insertGenerated(transactions: Transaction[]) {
    this.mutate((db) => {
      const key = (t: Transaction) => `${t.installment_group_id}#${t.installment_number}`;
      const have = new Set(db.transactions.map(key));
      db.transactions.push(...transactions.filter((t) => !have.has(key(t))));
    });
  }

  async endGroup(groupId: string, cancelTransactionIds: string[]) {
    this.mutate((db) => {
      mustFind(db.groups, groupId, "Cobrança").active = false;
      const now = new Date().toISOString();
      for (const t of db.transactions) if (cancelTransactionIds.includes(t.id)) Object.assign(t, { status: "CANCELLED", cancelled_at: now });
    });
  }

  async setReminderStatus(transactionId: string, remindAt: string, status: Reminder["status"]) {
    return this.mutate((db) => {
      let r = db.reminders.find((x) => x.transaction_id === transactionId);
      if (!r) {
        r = { id: newId(), transaction_id: transactionId, remind_at: remindAt, status, channel: "IN_APP" };
        db.reminders.push(r);
      } else {
        r.status = status;
        r.remind_at = remindAt;
      }
      return r;
    });
  }

  async resetAll() {
    this.store.write(this.mode === "ghost" ? demoDB("Visitante") : freshDB());
  }

  /** Acrescenta o conjunto de exemplo aos dados atuais (modo local). */
  async seedDemo() {
    this.mutate((db) => {
      const today = todayISO(db.profile.timezone);
      const demo = buildDemoData(db.categories, today, newId);
      db.transactions.push(...demo.transactions);
      db.groups.push(...demo.groups);
      if (!db.profile.onboarded) {
        Object.assign(db.profile, { opening_balance: 250000, opening_balance_date: addMonths(today, -3), onboarded: true });
        db.profile.display_name ||= "Minha conta";
      }
    });
  }
}
