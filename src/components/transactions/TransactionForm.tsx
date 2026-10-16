"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CreditCard } from "lucide-react";
import { useReady } from "@/providers/DataProvider";
import { useToast } from "@/providers/ToastProvider";
import { Field, MoneyInput, Seg, Sheet } from "@/components/ui";
import { newId } from "@/lib/data";
import { addMonths, dmy } from "@/lib/domain/dates";
import { pendingDate, splitInstallments } from "@/lib/domain/finance";
import { brl } from "@/lib/domain/money";
import { fieldErrors, installmentSchema, transactionSchema, type TransactionInput } from "@/lib/domain/schemas";
import type { PaymentMethod, Scope, Transaction, TxType } from "@/lib/domain/types";

const METHODS_ALL: [PaymentMethod, string][] = [
  ["UNSPECIFIED", "A definir"],
  ["PIX", "Pix"],
  ["DEBIT_CARD", "Débito"],
  ["CREDIT_CARD", "Crédito"],
];
const METHODS_KNOWN = METHODS_ALL.slice(1) as [PaymentMethod, string][];

interface Props {
  initialType?: TxType;
  /** Quando informado, edita esta movimentação. */
  editing?: Transaction;
}

export function TransactionForm({ initialType = "EXPENSE", editing }: Props) {
  const data = useReady();
  const { categories, today, scope: globalScope } = data;
  const router = useRouter();
  const toast = useToast();

  const [formId] = useState(() => newId());
  const [type, setType] = useState<TxType>(editing?.type ?? initialType);
  const [amount, setAmount] = useState(editing?.amount ?? 0);
  const [description, setDescription] = useState(editing?.description ?? "");
  const [scope, setScope] = useState<Scope>(editing?.scope ?? (globalScope === "PERSONAL" ? "PERSONAL" : "BUSINESS"));
  const [categoryId, setCategoryId] = useState(editing?.category_id ?? "");
  const [status, setStatus] = useState<"PENDING" | "SETTLED">(editing?.status === "SETTLED" ? "SETTLED" : editing ? "PENDING" : initialType === "INCOME" ? "PENDING" : "SETTLED");
  const [refDate, setRefDate] = useState(editing ? (pendingDate(editing) ?? "") : initialType === "INCOME" ? "" : today);
  const [settledAt, setSettledAt] = useState(editing?.settled_at ?? today);
  const [method, setMethod] = useState<PaymentMethod>(editing?.payment_method ?? "UNSPECIFIED");
  const [txDate, setTxDate] = useState(editing?.transaction_date ?? today);
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [installment, setInstallment] = useState(false);
  const [count, setCount] = useState(2);
  const [firstDue, setFirstDue] = useState(addMonths(today, 1));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const isParcel = !!editing?.installment_group_id;
  const income = type === "INCOME";

  // Categorias ativas do tipo, com as do contexto escolhido primeiro (regra: arquivadas não aparecem).
  const options = useMemo(() => {
    const list = categories.filter((c) => c.transaction_type === type && (!c.is_archived || c.id === editing?.category_id));
    const same = list.filter((c) => c.default_scope === scope).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    const other = list.filter((c) => c.default_scope !== scope).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    return { same, other };
  }, [categories, type, scope, editing?.category_id]);

  function changeType(t: TxType) {
    setType(t);
    setCategoryId("");
    setInstallment(false);
    setStatus(t === "INCOME" ? "PENDING" : "SETTLED");
    setRefDate(t === "INCOME" ? "" : today);
    setErrors({});
  }

  function changeScope(s: Scope) {
    setScope(s);
    const cat = categories.find((c) => c.id === categoryId);
    if (cat && cat.default_scope !== s) setCategoryId("");
  }

  const preview = useMemo(() => {
    if (!installment || amount < count || count < 2) return [];
    try {
      return splitInstallments(amount, count).map((v, i) => ({ n: i + 1, value: v, due: addMonths(firstDue, i) }));
    } catch {
      return [];
    }
  }, [installment, amount, count, firstDue]);

  function validateSimple(): TransactionInput | null {
    const input = {
      type,
      scope,
      status,
      amount,
      description,
      category_id: categoryId,
      transaction_date: txDate,
      ref_date: refDate,
      settled_at: status === "SETTLED" ? settledAt : "",
      payment_method: method,
      notes,
    };
    const parsed = transactionSchema.safeParse(input);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return null;
    }
    if (status === "SETTLED" && settledAt > today) {
      setErrors({ settled_at: "A data efetiva não pode estar no futuro." });
      return null;
    }
    setErrors({});
    return parsed.data;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    if (installment) {
      const parsed = installmentSchema.safeParse({ description, total_amount: amount, installment_count: count, first_due_date: firstDue, scope, category_id: categoryId });
      if (!parsed.success) return setErrors(fieldErrors(parsed.error));
      if (amount < count) return setErrors({ total_amount: "Valor menor que o número de parcelas." });
      setErrors({});
      setConfirming(true); // PRD: confirmação antes de salvar
      return;
    }

    const v = validateSimple();
    if (!v) return;
    const row = {
      type: v.type,
      scope: v.scope,
      status: v.status,
      description: v.description.trim() || data.categoryName(v.category_id),
      amount: v.amount,
      category_id: v.category_id,
      transaction_date: v.transaction_date,
      due_date: v.type === "EXPENSE" ? v.ref_date || null : null,
      expected_date: v.type === "INCOME" ? v.ref_date || null : null,
      settled_at: v.status === "SETTLED" ? v.settled_at : null,
      payment_method: v.payment_method,
      notes: v.notes.trim() || null,
    };
    setBusy(true);
    try {
      if (editing) {
        const patch = isParcel ? { ...row, amount: editing.amount, type: editing.type } : row;
        await data.updateTransaction(editing.id, patch);
        toast("Alterações salvas.");
        router.replace(`/movimentacoes/${editing.id}`);
      } else {
        const tx = await data.createTransaction(row, formId);
        const what = income ? (tx.status === "SETTLED" ? "Entrada recebida" : "Entrada prevista") : tx.status === "SETTLED" ? "Saída paga" : "Conta a pagar";
        toast(`${what}: ${brl(tx.amount)}`);
        router.replace(tx.status === "SETTLED" ? "/movimentacoes" : income ? "/contas-a-receber" : "/contas-a-pagar");
      }
    } catch (err) {
      setErrors({ _: err instanceof Error ? err.message : "Não foi possível salvar." });
      setBusy(false);
    }
  }

  async function confirmInstallments() {
    if (busy) return;
    setBusy(true);
    try {
      await data.createInstallments({
        id: formId,
        description: description.trim(),
        total_amount: amount,
        installment_count: count,
        first_due_date: firstDue,
        scope,
        category_id: categoryId,
        transaction_date: txDate,
      });
      toast(`Compra parcelada em ${count}x criada.`);
      router.replace(`/movimentacoes/parcelamento/${formId}`);
    } catch (err) {
      setConfirming(false);
      setErrors({ _: err instanceof Error ? err.message : "Não foi possível salvar." });
      setBusy(false);
    }
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={submit} noValidate>
      {!editing && (
        <Seg
          label="Tipo de lançamento"
          value={type}
          onChange={changeType}
          options={[
            ["EXPENSE", "Saída"],
            ["INCOME", "Entrada"],
          ]}
        />
      )}

      <Field label={installment ? "Valor total da compra" : "Valor"} error={errors.amount || errors.total_amount}>
        {(id) => <MoneyInput id={id} big cents={amount} onChange={setAmount} invalid={!!(errors.amount || errors.total_amount)} autoFocus={!editing} />}
      </Field>
      {isParcel && <p className="cap -mt-3">O valor de uma parcela não pode ser alterado aqui para manter a soma igual ao total da compra.</p>}

      <Field label={installment ? "Descrição da compra" : "Descrição (opcional)"} error={errors.description}>
        {(id) => (
          <input
            id={id}
            className="field"
            maxLength={80}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={income ? "Ex.: Atendimento — Ana" : "Ex.: Reposição de produtos"}
            autoComplete="off"
          />
        )}
      </Field>

      <div>
        <span className="flabel">Contexto</span>
        <Seg
          label="Contexto"
          value={scope}
          onChange={changeScope}
          options={[
            ["BUSINESS", "Profissional"],
            ["PERSONAL", "Pessoal"],
          ]}
        />
      </div>

      <Field label="Categoria" error={errors.category_id}>
        {(id) => (
          <select id={id} className="field" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-invalid={!!errors.category_id}>
            <option value="">Selecione a categoria</option>
            <optgroup label={scope === "BUSINESS" ? "Profissionais" : "Pessoais"}>
              {options.same.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
            {options.other.length > 0 && (
              <optgroup label={scope === "BUSINESS" ? "Pessoais" : "Profissionais"}>
                {options.other.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        )}
      </Field>

      {!income && !editing && (
        <button
          type="button"
          role="switch"
          aria-checked={installment}
          onClick={() => setInstallment((v) => !v)}
          className="panel flex items-center justify-between gap-3 p-4 text-left"
        >
          <span className="flex min-w-0 items-center gap-3">
            <CreditCard size={22} className="flex-none text-ink-2" aria-hidden />
            <span className="flex flex-col">
              <span className="font-medium">Parcelar no cartão de crédito</span>
              <span className="row-sub">Cria uma conta a pagar por parcela</span>
            </span>
          </span>
          <span className="switch" data-on={installment} aria-hidden />
        </button>
      )}

      {installment ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Parcelas" error={errors.installment_count}>
              {(id) => (
                <select id={id} className="field" value={count} onChange={(e) => setCount(Number(e.target.value))}>
                  {Array.from({ length: 23 }, (_, i) => i + 2).map((n) => (
                    <option key={n} value={n}>
                      {n}x
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="1ª parcela vence" error={errors.first_due_date}>
              {(id) => <input id={id} type="date" className="field" value={firstDue} onChange={(e) => setFirstDue(e.target.value)} />}
            </Field>
          </div>
          {preview.length > 0 && (
            <section className="panel p-4" aria-label="Prévia das parcelas">
              <p className="cap mb-2">Intervalo mensal · ajuste de centavos na última parcela</p>
              <ul className="flex flex-col gap-1.5 text-sm">
                {preview.map((p) => (
                  <li key={p.n} className="flex justify-between gap-3">
                    <span className="text-ink-2">
                      {p.n}/{count} · vence {dmy(p.due)}
                    </span>
                    <span className="num font-semibold">{brl(p.value)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      ) : (
        <>
          <div>
            <span className="flabel">Situação</span>
            <Seg
              label="Situação"
              value={status}
              onChange={(s) => {
                setStatus(s);
                if (s === "SETTLED" && method === "UNSPECIFIED") setMethod("PIX");
              }}
              options={income ? [["PENDING", "Prevista"], ["SETTLED", "Recebida"]] : [["PENDING", "A pagar"], ["SETTLED", "Paga"]]}
            />
          </div>

          {status === "PENDING" ? (
            <Field
              label={income ? "Data prevista (opcional)" : "Vencimento"}
              error={errors.ref_date}
              hint={income ? "Deixe em branco se ainda não houver data — aparecerá como “sem data”." : undefined}
            >
              {(id) => <input id={id} type="date" className="field" value={refDate} onChange={(e) => setRefDate(e.target.value)} aria-invalid={!!errors.ref_date} />}
            </Field>
          ) : (
            <Field label={income ? "Data do recebimento" : "Data do pagamento"} error={errors.settled_at}>
              {(id) => <input id={id} type="date" className="field" value={settledAt} max={today} onChange={(e) => setSettledAt(e.target.value)} />}
            </Field>
          )}

          <div>
            <span className="flabel">{income ? "Forma de recebimento" : "Forma de pagamento"}</span>
            <Seg label="Forma de pagamento" small value={method} onChange={setMethod} options={status === "SETTLED" ? METHODS_KNOWN : METHODS_ALL} />
            {errors.payment_method && <p className="error mt-1.5">{errors.payment_method}</p>}
          </div>
        </>
      )}

      <details className="group">
        <summary className="linkbtn cursor-pointer list-none">Mais detalhes</summary>
        <div className="mt-3 flex flex-col gap-4">
          <Field label="Data de lançamento">
            {(id) => <input id={id} type="date" className="field" value={txDate} onChange={(e) => setTxDate(e.target.value)} />}
          </Field>
          {!installment && (
            <Field label="Observações" error={errors.notes}>
              {(id) => <textarea id={id} className="field" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />}
            </Field>
          )}
        </div>
      </details>

      {errors._ && (
        <p className="error" role="alert">
          {errors._}
        </p>
      )}
      {Object.keys(errors).length > 0 && !errors._ && (
        <p className="error" role="alert">
          Confira os campos destacados.
        </p>
      )}

      <button type="submit" className="cta" disabled={busy}>
        {editing ? "Salvar alterações" : installment ? "Revisar parcelas" : "Confirmar"}
      </button>

      <Sheet open={confirming} onClose={() => setConfirming(false)} title="Confirmar parcelamento">
        <p className="text-ink-2">
          {description} · {brl(amount)} em {count}x no cartão de crédito. Serão criadas {count} contas a pagar:
        </p>
        <ul className="panel flex flex-col gap-1.5 p-4 text-sm">
          {preview.map((p) => (
            <li key={p.n} className="flex justify-between gap-3">
              <span className="text-ink-2">
                {p.n}/{count} · {dmy(p.due)}
              </span>
              <span className="num font-semibold">{brl(p.value)}</span>
            </li>
          ))}
        </ul>
        <button type="button" className="cta" disabled={busy} onClick={confirmInstallments}>
          Criar {count} parcelas
        </button>
        <button type="button" className="btn-ghost" onClick={() => setConfirming(false)}>
          Voltar e editar
        </button>
      </Sheet>
    </form>
  );
}
