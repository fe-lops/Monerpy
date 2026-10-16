// Adaptador Supabase: Auth + PostgreSQL. A segurança vem do RLS no banco
// (supabase/migrations), não deste código — o navegador só tem a chave anon.

import type { SupabaseClient } from "@supabase/supabase-js";
import { todayISO } from "../dates";
import { centsToNumeric, numericToCents } from "../money";
import type { Category, Profile, Reminder, Transaction } from "../types";
import type { Repo, SessionInfo, Snapshot } from "./repo";
import { DEFAULT_CATEGORIES } from "./seed";

type Row = Record<string, unknown>;

const TZ = "America/Sao_Paulo";

/** settled_at é TIMESTAMPTZ no banco; no app usamos só a data efetiva. */
function settledToDate(v: unknown): string | null {
  if (!v) return null;
  return todayISO(TZ, new Date(String(v)));
}
function dateToSettled(d: string | null | undefined): string | null {
  return d ? `${d}T12:00:00-03:00` : null;
}

function toProfile(r: Row): Profile {
  return {
    user_id: String(r.user_id),
    display_name: (r.display_name as string) ?? "",
    opening_balance: numericToCents(r.opening_balance as string),
    opening_balance_date: String(r.opening_balance_date),
    timezone: (r.timezone as string) ?? TZ,
    onboarded: Boolean(r.onboarded),
  };
}

function toTx(r: Row): Transaction {
  return {
    id: String(r.id),
    category_id: (r.category_id as string) ?? null,
    installment_group_id: (r.installment_group_id as string) ?? null,
    type: r.type as Transaction["type"],
    scope: r.scope as Transaction["scope"],
    status: r.status as Transaction["status"],
    description: (r.description as string) ?? "",
    amount: numericToCents(r.amount as string),
    transaction_date: String(r.transaction_date),
    due_date: (r.due_date as string) ?? null,
    expected_date: (r.expected_date as string) ?? null,
    settled_at: settledToDate(r.settled_at),
    payment_method: r.payment_method as Transaction["payment_method"],
    installment_number: (r.installment_number as number) ?? null,
    installment_count: (r.installment_count as number) ?? null,
    notes: (r.notes as string) ?? null,
    created_at: String(r.created_at),
    cancelled_at: (r.cancelled_at as string) ?? null,
  };
}

/** Converte um patch do app para colunas do banco. */
function txToRow(t: Partial<Transaction>): Row {
  const row: Row = { ...t };
  if (t.amount !== undefined) row.amount = centsToNumeric(t.amount);
  if ("settled_at" in t) row.settled_at = dateToSettled(t.settled_at);
  return row;
}

function fail(error: { message: string } | null): void {
  if (error) throw new Error(translate(error.message));
}

function translate(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return "E-mail ou senha incorretos.";
  if (/email not confirmed/i.test(msg)) return "Confirme seu e-mail antes de entrar.";
  if (/duplicate key.*categories/i.test(msg)) return "Já existe uma categoria com esse nome.";
  if (/auth session missing|session.*not found/i.test(msg))
    return "Sessão de redefinição não encontrada. Abra o link no mesmo navegador em que pediu a redefinição ou peça um novo link.";
  if (/rate limit/i.test(msg)) return "Muitas tentativas. Aguarde alguns minutos.";
  if (/password should be/i.test(msg)) return "A senha precisa ter pelo menos 6 caracteres.";
  if (/does not exist|could not find the (table|function)|schema cache/i.test(msg))
    return "O banco do Monerpy ainda não foi criado neste projeto Supabase. Rode o arquivo supabase/migrations/20261015000000_init.sql no SQL Editor.";
  if (/row-level security|permission denied/i.test(msg)) return "Sem permissão para acessar os dados. Confira se a migration (com as políticas RLS) foi executada.";
  if (/failed to fetch|networkerror|load failed/i.test(msg)) return "Não foi possível conectar ao Supabase. Confira a URL do projeto e sua conexão.";
  if (/invalid api key|no api key/i.test(msg)) return "Chave do Supabase inválida. Confira NEXT_PUBLIC_SUPABASE_ANON_KEY na Vercel.";
  return msg;
}

export class SupabaseRepo implements Repo {
  readonly mode = "supabase" as const;
  constructor(private sb: SupabaseClient) {}

  async getSession(): Promise<SessionInfo | null> {
    const { data } = await this.sb.auth.getUser();
    return data.user ? { userId: data.user.id, email: data.user.email ?? null } : null;
  }
  async signIn(email: string, password: string) {
    const { error } = await this.sb.auth.signInWithPassword({ email, password });
    fail(error);
  }
  async signOut() {
    await this.sb.auth.signOut();
  }
  async requestPasswordReset(email: string, redirectTo: string) {
    const { error } = await this.sb.auth.resetPasswordForEmail(email, { redirectTo });
    fail(error);
  }
  async updatePassword(password: string) {
    const { error } = await this.sb.auth.updateUser({ password });
    fail(error);
  }

  async load(): Promise<Snapshot> {
    await this.ensureProfile();
    const [p, c, t, r] = await Promise.all([
      this.sb.from("profiles").select("*").single(),
      this.sb.from("categories").select("*").order("name"),
      this.sb.from("transactions").select("*").order("transaction_date", { ascending: false }),
      this.sb.from("reminders").select("*"),
    ]);
    fail(p.error);
    fail(c.error);
    fail(t.error);
    fail(r.error);
    return {
      profile: toProfile(p.data as Row),
      categories: (c.data as Category[]).map((x) => ({ ...x })),
      transactions: (t.data as Row[]).map(toTx),
      reminders: r.data as Reminder[],
    };
  }

  /**
   * Usuária criada antes da migration não ganhou perfil/categorias pelo gatilho do banco.
   * Cria aqui no primeiro login (o RLS permite inserir apenas os próprios dados).
   */
  private async ensureProfile() {
    const { data: u } = await this.sb.auth.getUser();
    if (!u.user) throw new Error("Sessão expirada. Entre novamente.");
    const existing = await this.sb.from("profiles").select("user_id").maybeSingle();
    fail(existing.error);
    if (existing.data) return;

    const ins = await this.sb.from("profiles").insert({ user_id: u.user.id });
    if (ins.error && ins.error.code !== "23505") fail(ins.error); // 23505 = já criado em paralelo

    const cats = await this.sb.from("categories").select("id").limit(1);
    fail(cats.error);
    if (!cats.data?.length) {
      const seed = await this.sb.from("categories").insert(DEFAULT_CATEGORIES);
      if (seed.error && seed.error.code !== "23505") fail(seed.error);
    }
  }

  async updateProfile(patch: Partial<Omit<Profile, "user_id">>) {
    const row: Row = { ...patch };
    if (patch.opening_balance !== undefined) row.opening_balance = centsToNumeric(patch.opening_balance);
    const { data: u } = await this.sb.auth.getUser();
    const { data, error } = await this.sb.from("profiles").update(row).eq("user_id", u.user?.id ?? "").select().single();
    fail(error);
    return toProfile(data as Row);
  }

  async createCategory(c: Omit<Category, "id" | "is_archived">) {
    const { data, error } = await this.sb.from("categories").insert(c).select().single();
    fail(error);
    return data as Category;
  }

  async updateCategory(id: string, patch: Partial<Omit<Category, "id">>) {
    const { data, error } = await this.sb.from("categories").update(patch).eq("id", id).select().single();
    fail(error);
    return data as Category;
  }

  async createTransaction(t: Parameters<Repo["createTransaction"]>[0]) {
    // upsert com ignoreDuplicates: reenviar o mesmo id (clique duplo / rede) não duplica.
    const { error } = await this.sb.from("transactions").upsert(txToRow(t), { onConflict: "id", ignoreDuplicates: true });
    fail(error);
    const { data, error: e2 } = await this.sb.from("transactions").select("*").eq("id", t.id).single();
    fail(e2);
    return toTx(data as Row);
  }

  async updateTransaction(id: string, patch: Partial<Omit<Transaction, "id" | "created_at">>) {
    const { data, error } = await this.sb.from("transactions").update(txToRow(patch)).eq("id", id).select().single();
    fail(error);
    return toTx(data as Row);
  }

  async createInstallmentPurchase(p: Parameters<Repo["createInstallmentPurchase"]>[0]) {
    const { error } = await this.sb.rpc("create_installment_purchase", {
      p_group_id: p.id,
      p_description: p.description,
      p_total_amount: centsToNumeric(p.total_amount),
      p_installment_count: p.installment_count,
      p_first_due_date: p.first_due_date,
      p_scope: p.scope,
      p_category_id: p.category_id,
      p_transaction_date: p.transaction_date,
    });
    fail(error);
    const { data, error: e2 } = await this.sb.from("transactions").select("*").eq("installment_group_id", p.id).order("installment_number");
    fail(e2);
    return (data as Row[]).map(toTx);
  }

  async setReminderStatus(transactionId: string, remindAt: string, status: Reminder["status"]) {
    const { data, error } = await this.sb
      .from("reminders")
      .upsert({ transaction_id: transactionId, remind_at: remindAt, status, channel: "IN_APP" }, { onConflict: "user_id,transaction_id" })
      .select()
      .single();
    fail(error);
    return data as Reminder;
  }
}
