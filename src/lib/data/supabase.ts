// Adaptador Supabase: Auth + PostgreSQL. A segurança vem do RLS no banco
// (supabase/migrations), não deste código — o navegador só tem a chave anon.

import type { SupabaseClient } from "@supabase/supabase-js";
import { todayISO } from "../domain/dates";
import { centsToNumeric, numericToCents } from "../domain/money";
import type { Category, InstallmentGroup, Profile, Reminder, Transaction } from "../domain/types";
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
    is_admin: Boolean(r.is_admin),
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

function toGroup(r: Row): InstallmentGroup {
  return {
    id: String(r.id),
    kind: ((r.kind as string) ?? "INSTALLMENT") as InstallmentGroup["kind"],
    type: ((r.type as string) ?? "EXPENSE") as InstallmentGroup["type"],
    description: (r.description as string) ?? "",
    total_amount: numericToCents(r.total_amount as string),
    installment_count: (r.installment_count as number) ?? null,
    periodicity: ((r.periodicity as string) ?? "MONTHLY") as InstallmentGroup["periodicity"],
    interval_days: (r.interval_days as number) ?? null,
    payment_method: r.payment_method as InstallmentGroup["payment_method"],
    first_due_date: String(r.first_due_date),
    scope: r.scope as InstallmentGroup["scope"],
    category_id: (r.category_id as string) ?? null,
    active: r.active === undefined ? true : Boolean(r.active),
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
  async deleteAccount() {
    const token = await this.getAccessToken();
    const res = await fetch("/api/conta", { method: "DELETE", headers: { Authorization: `Bearer ${token ?? ""}` } });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error ?? "Não foi possível excluir a conta.");
    // O usuário já não existe no servidor: limpa só a sessão guardada neste navegador.
    await this.sb.auth.signOut({ scope: "local" });
  }
  async getAccessToken() {
    const { data } = await this.sb.auth.getSession();
    return data.session?.access_token ?? null;
  }
  async verifyEmailToken(tokenHash: string, type: "invite" | "magiclink" | "recovery") {
    const { error } = await this.sb.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error && /expired|invalid/i.test(error.message)) throw new Error("Este link expirou ou já foi usado. Peça ao administrador para reenviar.");
    fail(error);
  }
  async updatePassword(password: string) {
    const { error } = await this.sb.auth.updateUser({ password });
    fail(error);
  }

  async load(): Promise<Snapshot> {
    await this.ensureProfile();
    const [p, c, t, r, g] = await Promise.all([
      this.sb.from("profiles").select("*").single(),
      this.sb.from("categories").select("*").order("name"),
      this.sb.from("transactions").select("*").order("transaction_date", { ascending: false }),
      this.sb.from("reminders").select("*"),
      this.sb.from("installment_groups").select("*"),
    ]);
    fail(g.error);
    fail(p.error);
    fail(c.error);
    fail(t.error);
    fail(r.error);
    return {
      profile: toProfile(p.data as Row),
      categories: (c.data as Category[]).map((x) => ({ ...x })),
      transactions: (t.data as Row[]).map(toTx),
      reminders: r.data as Reminder[],
      groups: (g.data as Row[]).map(toGroup),
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

  async createGroup(group: InstallmentGroup, transactions: Transaction[]) {
    // Grupo + cobranças numa única transação do banco (create_transaction_group); idempotente pelo id.
    const { error } = await this.sb.rpc("create_transaction_group", {
      p_group: { ...group, total_amount: centsToNumeric(group.total_amount) },
      p_transactions: transactions.map((t) => ({
        id: t.id,
        category_id: t.category_id,
        type: t.type,
        scope: t.scope,
        description: t.description,
        amount: centsToNumeric(t.amount),
        transaction_date: t.transaction_date,
        due_date: t.due_date,
        expected_date: t.expected_date,
        installment_number: t.installment_number,
        installment_count: t.installment_count,
      })),
    });
    fail(error);
    const { data, error: e2 } = await this.sb.from("transactions").select("*").eq("installment_group_id", group.id).order("installment_number");
    fail(e2);
    return (data as Row[]).map(toTx);
  }

  async insertGenerated(transactions: Transaction[]) {
    if (!transactions.length) return;
    const rows = transactions.map(({ created_at: _c, cancelled_at: _x, ...t }) => txToRow(t)); // eslint-disable-line @typescript-eslint/no-unused-vars
    // Outro aparelho pode ter gerado a mesma cobrança: ignora pelo par (grupo, número).
    const { error } = await this.sb.from("transactions").upsert(rows, { onConflict: "installment_group_id,installment_number", ignoreDuplicates: true });
    fail(error);
  }

  async endGroup(groupId: string, cancelTransactionIds: string[]) {
    const { error } = await this.sb.from("installment_groups").update({ active: false, ended_at: new Date().toISOString() }).eq("id", groupId);
    fail(error);
    if (cancelTransactionIds.length) {
      const { error: e2 } = await this.sb
        .from("transactions")
        .update({ status: "CANCELLED", cancelled_at: new Date().toISOString() })
        .in("id", cancelTransactionIds);
      fail(e2);
    }
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
