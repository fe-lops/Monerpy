"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getRepo, newId, type Repo, type SessionInfo, type Snapshot } from "@/lib/data";
import { LocalRepo } from "@/lib/data/local";
import { todayISO } from "@/lib/dates";
import { availableBalance } from "@/lib/finance";
import type {
  Category,
  ISODate,
  NewInstallmentPurchase,
  NewTransaction,
  PaymentMethod,
  Profile,
  ReminderStatus,
  ScopeFilter,
  Transaction,
} from "@/lib/types";

type Status = "loading" | "anon" | "ready" | "error";

interface DataCtx extends Partial<Snapshot> {
  repo: Repo;
  status: Status;
  error: string | null;
  session: SessionInfo | null;
  today: ISODate;
  balance: number;
  scope: ScopeFilter;
  setScope: (s: ScopeFilter) => void;
  categoryName: (id: string | null) => string;

  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  reload: () => Promise<unknown>;

  /** `id` gerado uma vez por formulário: reenviar não duplica. */
  createTransaction: (t: NewTransaction, id?: string) => Promise<Transaction>;
  updateTransaction: (id: string, patch: Partial<Transaction>) => Promise<Transaction>;
  settle: (id: string, date: ISODate, method: PaymentMethod) => Promise<Transaction>;
  reopen: (id: string) => Promise<Transaction>;
  cancel: (id: string) => Promise<Transaction>;
  restore: (id: string) => Promise<Transaction>;
  createInstallments: (p: NewInstallmentPurchase) => Promise<Transaction[]>;

  updateProfile: (patch: Partial<Omit<Profile, "user_id">>) => Promise<void>;
  createCategory: (c: Omit<Category, "id" | "is_archived">) => Promise<Category>;
  updateCategory: (id: string, patch: Partial<Omit<Category, "id">>) => Promise<Category>;
  setReminder: (transactionId: string, remindAt: string, status: ReminderStatus) => Promise<void>;

  seedDemo?: () => Promise<void>;
  resetAll?: () => Promise<void>;
}

const Ctx = createContext<DataCtx | null>(null);

export function useData(): DataCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useData fora do DataProvider");
  return v;
}

/** Atalho para telas autenticadas: garante que os dados já carregaram. */
export function useReady() {
  const d = useData();
  return d as DataCtx & Snapshot;
}

const SCOPE_KEY = "monerpy:scope";

export function DataProvider({ children }: { children: React.ReactNode }) {
  const repo = useMemo(() => getRepo(), []);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [scope, setScopeState] = useState<ScopeFilter>("ALL");

  /** Carrega sessão e dados. Retorna a mensagem de erro, se houver. */
  const load = useCallback(async (): Promise<string | null> => {
    try {
      const s = await repo.getSession();
      setSession(s);
      if (!s) {
        setSnap(null);
        setStatus("anon");
        return null;
      }
      setSnap(await repo.load());
      setStatus("ready");
      setError(null);
      return null;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao carregar os dados.";
      setError(msg);
      setStatus("error");
      return msg;
    }
  }, [repo]);

  useEffect(() => {
    load();
    try {
      const s = sessionStorage.getItem(SCOPE_KEY);
      if (s === "ALL" || s === "BUSINESS" || s === "PERSONAL") setScopeState(s);
    } catch {}
  }, [load]);

  const setScope = useCallback((s: ScopeFilter) => {
    setScopeState(s);
    try {
      sessionStorage.setItem(SCOPE_KEY, s);
    } catch {}
  }, []);

  const tz = snap?.profile.timezone;
  const today = todayISO(tz);

  const putTx = useCallback((list: Transaction[]) => {
    setSnap((prev) => {
      if (!prev) return prev;
      const map = new Map(prev.transactions.map((t) => [t.id, t]));
      for (const t of list) map.set(t.id, t);
      return { ...prev, transactions: [...map.values()] };
    });
  }, []);

  const updateTransaction = useCallback(
    async (id: string, patch: Partial<Transaction>) => {
      const t = await repo.updateTransaction(id, patch);
      putTx([t]);
      return t;
    },
    [repo, putTx],
  );

  const value: DataCtx = {
    repo,
    status,
    error,
    session,
    today,
    scope,
    setScope,
    ...(snap ?? {}),
    balance: snap ? availableBalance(snap.profile, snap.transactions) : 0,
    categoryName: (id) => (id && snap?.categories.find((c) => c.id === id)?.name) || "Sem categoria",

    signIn: async (email, password) => {
      await repo.signIn(email, password);
      // Login aceito, mas se os dados não carregarem o erro precisa aparecer no formulário.
      const err = await load();
      if (err) throw new Error(err);
    },
    signOut: async () => {
      await repo.signOut();
      setSnap(null);
      setSession(null);
      setStatus("anon");
    },
    reload: load,

    createTransaction: async (t, id) => {
      const tx = await repo.createTransaction({ ...t, id: id ?? newId() });
      putTx([tx]);
      return tx;
    },
    updateTransaction,
    settle: (id, date, method) => updateTransaction(id, { status: "SETTLED", settled_at: date, payment_method: method }),
    reopen: (id) => updateTransaction(id, { status: "PENDING", settled_at: null }),
    cancel: (id) => updateTransaction(id, { status: "CANCELLED", cancelled_at: new Date().toISOString() }),
    restore: (id) => updateTransaction(id, { status: "PENDING", cancelled_at: null, settled_at: null }),
    createInstallments: async (p) => {
      const list = await repo.createInstallmentPurchase(p);
      putTx(list);
      return list;
    },

    updateProfile: async (patch) => {
      const p = await repo.updateProfile(patch);
      setSnap((prev) => (prev ? { ...prev, profile: p } : prev));
    },
    createCategory: async (c) => {
      const cat = await repo.createCategory(c);
      setSnap((prev) => (prev ? { ...prev, categories: [...prev.categories, cat] } : prev));
      return cat;
    },
    updateCategory: async (id, patch) => {
      const cat = await repo.updateCategory(id, patch);
      setSnap((prev) => (prev ? { ...prev, categories: prev.categories.map((c) => (c.id === id ? cat : c)) } : prev));
      return cat;
    },
    setReminder: async (transactionId, remindAt, st) => {
      const r = await repo.setReminderStatus(transactionId, remindAt, st);
      setSnap((prev) =>
        prev ? { ...prev, reminders: [...prev.reminders.filter((x) => x.transaction_id !== transactionId), r] } : prev,
      );
    },

    seedDemo:
      repo instanceof LocalRepo
        ? async () => {
            await repo.seedDemo();
            await load();
          }
        : undefined,
    resetAll: repo.resetAll
      ? async () => {
          await repo.resetAll!();
          await load();
        }
      : undefined,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
