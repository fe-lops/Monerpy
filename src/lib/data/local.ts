// Adaptador local: guarda tudo no localStorage deste navegador.
// Serve para desenvolver e demonstrar o app antes de conectar o Supabase.

import { DEFAULT_TZ, todayISO } from "../dates";
import { buildInstallments } from "../finance";
import type { Category, InstallmentGroup, Profile, Reminder, Transaction } from "../types";
import { newId, type Repo, type SessionInfo, type Snapshot } from "./repo";
import { DEFAULT_CATEGORIES, demoInstallment, demoTransactions } from "./seed";

const DB_KEY = "monerpy:db:v1";
const SESSION_KEY = "monerpy:local-session";
const LOCAL_USER = "local-user";

interface LocalDB extends Snapshot {
  groups: InstallmentGroup[];
}

function freshDB(): LocalDB {
  return {
    profile: {
      user_id: LOCAL_USER,
      display_name: "",
      opening_balance: 0,
      opening_balance_date: todayISO(),
      timezone: DEFAULT_TZ,
      onboarded: false,
    },
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c, id: newId(), is_archived: false })),
    transactions: [],
    reminders: [],
    groups: [],
  };
}

function read(): LocalDB {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw) as LocalDB;
  } catch {
    // dados corrompidos ou armazenamento bloqueado: recomeça
  }
  const db = freshDB();
  write(db);
  return db;
}

function write(db: LocalDB) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    throw new Error("Não foi possível salvar neste navegador (armazenamento cheio ou bloqueado).");
  }
}

function mutate<T>(fn: (db: LocalDB) => T): T {
  const db = read();
  const out = fn(db);
  write(db);
  return structuredClone(out);
}

function mustFind<T extends { id: string }>(list: T[], id: string, what: string): T {
  const item = list.find((x) => x.id === id);
  if (!item) throw new Error(`${what} não encontrado(a).`);
  return item;
}

export class LocalRepo implements Repo {
  readonly mode = "local" as const;

  async getSession(): Promise<SessionInfo | null> {
    try {
      return localStorage.getItem(SESSION_KEY) ? { userId: LOCAL_USER, email: null } : null;
    } catch {
      return null;
    }
  }
  async signIn() {
    localStorage.setItem(SESSION_KEY, "1");
  }
  async signOut() {
    localStorage.removeItem(SESSION_KEY);
  }
  async requestPasswordReset() {
    throw new Error("Recuperação de senha só funciona com o Supabase configurado.");
  }
  async updatePassword() {
    throw new Error("Troca de senha só funciona com o Supabase configurado.");
  }

  async load(): Promise<Snapshot> {
    const { profile, categories, transactions, reminders } = read();
    return structuredClone({ profile, categories, transactions, reminders });
  }

  async updateProfile(patch: Partial<Omit<Profile, "user_id">>) {
    return mutate((db) => Object.assign(db.profile, patch));
  }

  async createCategory(c: Omit<Category, "id" | "is_archived">) {
    return mutate((db) => {
      const exists = db.categories.some((x) => x.name.trim().toLowerCase() === c.name.trim().toLowerCase() && x.transaction_type === c.transaction_type);
      if (exists) throw new Error("Já existe uma categoria com esse nome.");
      const cat: Category = { ...c, id: newId(), is_archived: false };
      db.categories.push(cat);
      return cat;
    });
  }

  async updateCategory(id: string, patch: Partial<Omit<Category, "id">>) {
    return mutate((db) => Object.assign(mustFind(db.categories, id, "Categoria"), patch));
  }

  async createTransaction(t: Parameters<Repo["createTransaction"]>[0]) {
    return mutate((db) => {
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
    return mutate((db) => Object.assign(mustFind(db.transactions, id, "Movimentação"), patch));
  }

  async createInstallmentPurchase(p: Parameters<Repo["createInstallmentPurchase"]>[0]) {
    return mutate((db) => {
      if (db.groups.some((g) => g.id === p.id)) return db.transactions.filter((t) => t.installment_group_id === p.id);
      const parts = buildInstallments(p, newId, new Date().toISOString());
      db.groups.push({
        id: p.id,
        description: p.description,
        total_amount: p.total_amount,
        installment_count: p.installment_count,
        payment_method: "CREDIT_CARD",
        first_due_date: p.first_due_date,
        scope: p.scope,
        category_id: p.category_id,
      });
      db.transactions.push(...parts);
      return parts;
    });
  }

  async setReminderStatus(transactionId: string, remindAt: string, status: Reminder["status"]) {
    return mutate((db) => {
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
    write(freshDB());
  }

  /** Preenche com movimentações de exemplo (só no modo local). */
  async seedDemo() {
    const db = read();
    const today = todayISO(db.profile.timezone);
    db.transactions.push(...demoTransactions(db.categories, today, newId));
    if (!db.profile.onboarded) {
      db.profile.opening_balance = 250000;
      db.profile.onboarded = true;
      db.profile.display_name = db.profile.display_name || "Minha conta";
    }
    write(db);
    await this.createInstallmentPurchase(demoInstallment(db.categories, today, newId));
  }
}
