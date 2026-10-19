"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Field, MoneyInput, Seg, Sheet } from "@/components/ui";
import { newId } from "@/lib/data";
import { findOtherCategory, selectableCategories } from "@/lib/domain/categories";
import { addMonths, dmy, sameDayInMonth } from "@/lib/domain/dates";
import { pendingDate } from "@/lib/domain/finance";
import { brl } from "@/lib/domain/money";
import { FIXED_HORIZON_MONTHS, groupAmounts, MAX_INSTALLMENTS, occurrenceDate, periodicityText } from "@/lib/domain/recurrence";
import { fieldErrors, groupSchema, transactionSchema, type TransactionInput } from "@/lib/domain/schemas";
import { descriptionSuggestions, type DescriptionSuggestion } from "@/lib/domain/suggestions";
import { PERIODICITY_LABEL, type PaymentMethod, type Periodicity, type Scope, type Transaction, type TxType } from "@/lib/domain/types";
import { useReady } from "@/providers/DataProvider";
import { useToast } from "@/providers/ToastProvider";
import { CategoryPicker } from "./CategoryPicker";
import { CreditModePicker, type CreditMode } from "./CreditModePicker";
import { DescriptionSuggestions } from "./DescriptionSuggestions";
import { TxTypeToggle } from "./TxTypeToggle";

const METHODS: [PaymentMethod, string][] = [
  ["UNSPECIFIED", "A definir"],
  ["PIX", "Pix"],
  ["DEBIT_CARD", "Débito"],
  ["CREDIT_CARD", "Crédito"],
];

const SCOPES: [Scope, string][] = [
  ["BUSINESS", "💼 Profissional"],
  ["PERSONAL", "👤 Pessoal"],
];

const PERIODICITIES = Object.keys(PERIODICITY_LABEL) as Periodicity[];

/** Conta do aviso de saldo: saldo atual, a saída e o saldo previsto (negativos em vermelho). */
function BalanceWarning({ balance, expense }: { balance: number; expense: number }) {
  const after = balance - expense;
  const rows: [string, number, string][] = [
    ["Saldo total", balance, balance < 0 ? "neg" : ""],
    ["Despesa", expense, ""],
    ["Saldo previsto", after, after < 0 ? "neg" : ""],
  ];
  return (
    <>
      <p className="text-ink-2">Com esta saída, o saldo total das suas contas vai zerar{after < 0 ? " e ficar negativo" : ""}. Deseja salvar mesmo assim?</p>
      <dl className="panel flex flex-col gap-2 p-4">
        {rows.map(([label, value, tone], i) => (
          <div key={label} className={`flex items-baseline justify-between gap-3 ${i === 2 ? "border-t border-line pt-2 font-semibold" : ""}`}>
            <dt className="text-ink-2">{label}</dt>
            <dd className={`amt ${tone}`}>{brl(value)}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

/** Máximo de linhas na prévia das cobranças. */
const PREVIEW_LIMIT = 6;

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

  // ---- estado do lançamento ----
  const [formId] = useState(() => newId()); // id fixo do formulário: reenviar não duplica
  const [type, setType] = useState<TxType>(editing?.type ?? initialType);
  const [amount, setAmount] = useState(editing?.amount ?? 0);
  const [description, setDescription] = useState(editing?.description ?? "");
  const [scope, setScope] = useState<Scope>(editing?.scope ?? (globalScope === "PERSONAL" ? "PERSONAL" : "BUSINESS"));
  // Lançamento novo começa com "Outros" do tipo; edição mantém a categoria salva.
  const [categoryId, setCategoryId] = useState(editing ? (editing.category_id ?? "") : (findOtherCategory(categories, initialType)?.id ?? ""));
  const initialStatus = editing?.status === "SETTLED" ? "SETTLED" : editing ? "PENDING" : initialType === "INCOME" ? "PENDING" : "SETTLED";
  const [status, setStatus] = useState<"PENDING" | "SETTLED">(initialStatus);
  const [refDate, setRefDate] = useState(editing ? (pendingDate(editing) ?? "") : initialType === "INCOME" ? "" : today);
  const [settledAt, setSettledAt] = useState(editing?.settled_at ?? today);
  const [method, setMethod] = useState<PaymentMethod>(editing?.payment_method ?? (initialStatus === "SETTLED" ? "PIX" : "UNSPECIFIED"));
  const [txDate, setTxDate] = useState(editing?.transaction_date ?? today);
  const [notes, setNotes] = useState(editing?.notes ?? "");

  // ---- crédito: parcelar/repetir ou fixa mensal ----
  /** Tipo de cobrança no crédito; null quando a forma não é Crédito. */
  const [creditMode, setCreditMode] = useState<CreditMode | null>(null);
  const [count, setCount] = useState("2");
  const [periodicity, setPeriodicity] = useState<Periodicity>("MONTHLY");
  const [customDays, setCustomDays] = useState("30");
  const [amountMode, setAmountMode] = useState<"TOTAL" | "EACH">("TOTAL");
  const [firstDue, setFirstDue] = useState(addMonths(today, 1));
  const [fixedStart, setFixedStart] = useState(today);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState(false);
  /** Aviso de saldo zerado/negativo aberto: valor da saída e o salvamento a fazer se confirmar. */
  const [warn, setWarn] = useState<{ expense: number; save: () => void } | null>(null);
  const [busy, setBusy] = useState(false);

  const isParcel = !!editing?.installment_group_id;
  const income = type === "INCOME";
  /** Parcelado/repetido ou fixa mensal: gera várias cobranças em vez de um lançamento. */
  const groupMode: "INSTALLMENT" | "FIXED" | null = creditMode === "INSTALLMENT" || creditMode === "FIXED" ? creditMode : null;
  const countNum = Number(count) || 0;
  const daysNum = periodicity === "CUSTOM" ? Number(customDays) || 0 : null;

  // Categorias ativas do tipo (Entrada/Saída), em ordem alfabética. Arquivadas não aparecem.
  const options = useMemo(() => selectableCategories(categories, type, editing?.category_id), [categories, type, editing?.category_id]);

  function changeType(t: TxType) {
    setType(t);
    setCategoryId(findOtherCategory(categories, t)?.id ?? ""); // "Outros" do novo tipo
    setCreditMode(method === "CREDIT_CARD" ? "SINGLE" : null);
    setStatus(t === "INCOME" ? "PENDING" : "SETTLED");
    setRefDate(t === "INCOME" ? "" : today);
    if (t === "EXPENSE" && method === "UNSPECIFIED") setMethod("PIX");
    setErrors({});
  }

  function changeMethod(m: PaymentMethod) {
    setMethod(m);
    // Os modos de cobrança só existem com Crédito; ao escolhê-lo, começa em "não recorrente".
    setCreditMode(m === "CREDIT_CARD" ? (creditMode ?? "SINGLE") : null);
    // Paga/recebida exige a forma conhecida: "A definir" volta o lançamento para pendente.
    if (m === "UNSPECIFIED" && status === "SETTLED") {
      setStatus("PENDING");
      if (type === "EXPENSE" && !refDate) setRefDate(today);
    }
  }

  function changeCreditMode(m: CreditMode) {
    setCreditMode(m);
    setErrors({});
  }

  // ---- sugestões pelo histórico: repetir um lançamento anterior ----
  const [suggestOpen, setSuggestOpen] = useState(false);
  const suggestions = useMemo(
    () => (editing ? [] : descriptionSuggestions(data.transactions, data.groups, description, type)),
    [editing, data.transactions, data.groups, description, type],
  );

  /** Copia os atributos do lançamento anterior; as datas vêm para o mês atual. */
  function applySuggestion({ description: name, tx, group }: DescriptionSuggestion) {
    setSuggestOpen(false);
    setDescription(name);
    setScope(tx.scope);
    if (tx.category_id && options.some((c) => c.id === tx.category_id)) setCategoryId(tx.category_id);
    setErrors({});
    if (group) {
      setMethod("CREDIT_CARD");
      setCreditMode(group.kind);
      setAmount(group.total_amount);
      if (group.kind === "FIXED") {
        setFixedStart(sameDayInMonth(group.first_due_date, today));
      } else {
        setAmountMode("TOTAL");
        setCount(String(group.installment_count ?? 2));
        setPeriodicity(group.periodicity);
        setCustomDays(String(group.interval_days ?? 30));
        setFirstDue(sameDayInMonth(group.first_due_date, addMonths(today, 1)));
      }
      return;
    }
    setAmount(tx.amount);
    setMethod(tx.payment_method);
    setCreditMode(tx.payment_method === "CREDIT_CARD" ? "SINGLE" : null);
    if (tx.status === "SETTLED") {
      setStatus("SETTLED");
      setSettledAt(today);
    } else {
      const ref = pendingDate(tx);
      setStatus("PENDING");
      setRefDate(ref ? sameDayInMonth(ref, today) : type === "EXPENSE" ? today : "");
    }
  }

  // ---- prévia das cobranças do grupo ----
  const preview = useMemo(() => {
    try {
      if (groupMode === "INSTALLMENT") {
        if (countNum < 2 || countNum > MAX_INSTALLMENTS || !amount || (periodicity === "CUSTOM" && !daysNum)) return null;
        if (amountMode === "TOTAL" && amount < countNum) return null;
        const values = groupAmounts(amount, countNum, amountMode);
        return {
          total: values.reduce((s, v) => s + v, 0),
          count: countNum,
          rows: values.slice(0, PREVIEW_LIMIT).map((v, i) => ({ n: i + 1, value: v, due: occurrenceDate(firstDue, i, periodicity, daysNum) })),
        };
      }
      if (groupMode === "FIXED") {
        if (!amount) return null;
        return {
          total: amount,
          count: null,
          rows: Array.from({ length: FIXED_HORIZON_MONTHS + 1 }, (_, i) => ({ n: i + 1, value: amount, due: occurrenceDate(fixedStart, i, "MONTHLY") })),
        };
      }
    } catch {
      return null;
    }
    return null;
  }, [groupMode, countNum, amount, periodicity, daysNum, amountMode, firstDue, fixedStart]);

  function validateSimple(): TransactionInput | null {
    const parsed = transactionSchema.safeParse({
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
    });
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

  function groupInput() {
    return {
      kind: groupMode!,
      description,
      amount,
      amount_mode: groupMode === "FIXED" ? ("EACH" as const) : amountMode,
      installment_count: groupMode === "FIXED" ? null : countNum || null,
      periodicity: groupMode === "FIXED" ? ("MONTHLY" as const) : periodicity,
      interval_days: groupMode === "FIXED" ? null : daysNum,
      first_due_date: groupMode === "FIXED" ? fixedStart : firstDue,
      scope,
      category_id: categoryId,
    };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    if (groupMode) {
      const parsed = groupSchema.safeParse(groupInput());
      if (!parsed.success) return setErrors(fieldErrors(parsed.error));
      setErrors({});
      setConfirming(true); // PRD: confirmação antes de criar várias cobranças
      return;
    }

    const v = validateSimple();
    if (!v) return;
    guardBalance(v.amount, () => saveSimple(v));
  }

  /**
   * Saída nova que deixaria o saldo total zerado ou negativo: pede confirmação antes de salvar
   * (qualquer forma de pagamento). Nos outros casos salva direto.
   */
  function guardBalance(expense: number, save: () => void) {
    if (!editing && type === "EXPENSE" && data.balance - expense <= 0) setWarn({ expense, save });
    else save();
  }

  async function saveSimple(v: TransactionInput) {
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

  async function confirmGroup() {
    if (busy || !groupMode) return;
    setBusy(true);
    try {
      const list = await data.createGroup({ id: formId, type, transaction_date: txDate, ...groupInput() });
      toast(groupMode === "FIXED" ? "Cobrança fixa mensal criada." : `${list.length} cobranças criadas no crédito.`);
      router.replace(`/movimentacoes/parcelamento/${formId}`);
    } catch (err) {
      setConfirming(false);
      setErrors({ _: err instanceof Error ? err.message : "Não foi possível salvar." });
      setBusy(false);
    }
  }

  const amountLabel = groupMode === "FIXED" ? "Valor mensal" : groupMode === "INSTALLMENT" ? (amountMode === "TOTAL" ? "Valor total" : "Valor de cada cobrança") : "Valor";
  const payLabel = income ? "Forma de recebimento" : "Forma de pagamento";

  return (
    // data-type pinta o valor e o botão de confirmar com a cor do tipo (ver .tx-form em globals.css).
    <form className="tx-form flex flex-col gap-5" data-type={income ? "income" : "expense"} onSubmit={submit} noValidate>
      {!editing && <TxTypeToggle value={type} onChange={changeType} />}

      {/* Sem autoFocus: no celular o teclado só abre quando a pessoa toca no campo. */}
      <Field label={amountLabel} error={errors.amount}>
        {(id) => <MoneyInput id={id} big cents={amount} onChange={setAmount} invalid={!!errors.amount} />}
      </Field>
      {isParcel && <p className="cap -mt-3">O valor de uma cobrança do grupo não pode ser alterado aqui, para manter a soma do grupo.</p>}

      <Field label={groupMode ? "Descrição" : "Descrição (opcional)"} error={errors.description}>
        {(id) => (
          <DescriptionSuggestions
            suggestions={suggestions}
            open={suggestOpen}
            categoryName={data.categoryName}
            onPick={applySuggestion}
            onDismiss={() => setSuggestOpen(false)}
          >
            <input
              id={id}
              className="field"
              maxLength={groupMode ? 60 : 80}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setSuggestOpen(!editing);
              }}
              placeholder={income ? "Ex.: Atendimento — Ana" : "Ex.: Supermercado do mês"}
              autoComplete="off"
            />
          </DescriptionSuggestions>
        )}
      </Field>

      <div>
        <span className="flabel">Contexto</span>
        <Seg label="Contexto" value={scope} onChange={setScope} options={SCOPES} />
      </div>

      <Field label="Categoria" error={errors.category_id}>
        {(id) => <CategoryPicker id={id} options={options} value={categoryId} onChange={setCategoryId} invalid={!!errors.category_id} />}
      </Field>

      <div>
        <span className="flabel">{payLabel}</span>
        {/* "A definir" fica sempre disponível; escolhê-la torna o lançamento pendente (ver changeMethod). */}
        <Seg label={payLabel} small value={method} onChange={changeMethod} options={METHODS} />
        {errors.payment_method && <p className="error mt-1.5">{errors.payment_method}</p>}
      </div>

      {/* Tipo de cobrança: só com Crédito selecionado e em lançamento novo. */}
      {method === "CREDIT_CARD" && !editing && creditMode && (
        <div>
          <span className="flabel">Tipo de cobrança no crédito</span>
          <CreditModePicker value={creditMode} onChange={changeCreditMode} />
        </div>
      )}

      {groupMode === "INSTALLMENT" && (
        <>
          <div>
            <span className="flabel">O valor digitado é</span>
            <Seg
              label="O valor digitado é"
              small
              value={amountMode}
              onChange={setAmountMode}
              options={[
                ["TOTAL", "O total (dividir)"],
                ["EACH", "De cada cobrança"],
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={amountMode === "TOTAL" ? "Parcelas" : "Repetições"} error={errors.installment_count}>
              {(id) => (
                <input
                  id={id}
                  className="field num"
                  type="number"
                  inputMode="numeric"
                  min={2}
                  max={MAX_INSTALLMENTS}
                  value={count}
                  onChange={(e) => setCount(e.target.value.replace(/\D/g, "").slice(0, 3))}
                  aria-invalid={!!errors.installment_count}
                />
              )}
            </Field>
            <Field label="1ª cobrança" error={errors.first_due_date}>
              {(id) => <input id={id} type="date" className="field" value={firstDue} onChange={(e) => setFirstDue(e.target.value)} />}
            </Field>
          </div>
          <Field label="Periodicidade">
            {(id) => (
              <select id={id} className="field" value={periodicity} onChange={(e) => setPeriodicity(e.target.value as Periodicity)}>
                {PERIODICITIES.map((p) => (
                  <option key={p} value={p}>
                    {PERIODICITY_LABEL[p]}
                  </option>
                ))}
              </select>
            )}
          </Field>
          {periodicity === "CUSTOM" && (
            <Field label="Cobrar a cada quantos dias?" error={errors.interval_days} hint="Ex.: 10 = uma cobrança a cada 10 dias.">
              {(id) => (
                <input
                  id={id}
                  className="field num"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={3650}
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  aria-invalid={!!errors.interval_days}
                />
              )}
            </Field>
          )}
        </>
      )}

      {groupMode === "FIXED" && (
        <Field label="Primeira cobrança" error={errors.first_due_date} hint={`Cobrada todo dia ${fixedStart.slice(8, 10)} no crédito, até você encerrar.`}>
          {(id) => <input id={id} type="date" className="field" value={fixedStart} onChange={(e) => setFixedStart(e.target.value)} />}
        </Field>
      )}

      {groupMode && preview && (
        <section className="panel p-4" aria-label="Prévia das cobranças">
          <p className="cap mb-2">
            {groupMode === "FIXED"
              ? `Próximas cobranças · as seguintes são criadas automaticamente`
              : `${preview.count} cobranças · ${periodicityText(periodicity, daysNum)} · total ${brl(preview.total)}${amountMode === "TOTAL" ? " · centavos na última" : ""}`}
          </p>
          <ul className="flex flex-col gap-1.5 text-sm">
            {preview.rows.map((p) => (
              <li key={p.n} className="flex justify-between gap-3">
                <span className="text-ink-2">
                  {preview.count ? `${p.n}/${preview.count}` : `${p.n}ª`} · {dmy(p.due)}
                </span>
                <span className="num font-semibold">{brl(p.value)}</span>
              </li>
            ))}
            {preview.count && preview.count > PREVIEW_LIMIT && <li className="cap">… e mais {preview.count - PREVIEW_LIMIT}</li>}
          </ul>
        </section>
      )}

      {!groupMode && (
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
        </>
      )}

      <details className="group">
        <summary className="linkbtn cursor-pointer list-none">Mais detalhes</summary>
        <div className="mt-3 flex flex-col gap-4">
          <Field label="Data de lançamento">
            {(id) => <input id={id} type="date" className="field" value={txDate} onChange={(e) => setTxDate(e.target.value)} />}
          </Field>
          {!groupMode && (
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

      <button type="submit" className="cta cta-tx" disabled={busy}>
        {editing ? "Salvar alterações" : groupMode ? "Revisar cobranças" : "Confirmar"}
      </button>

      <Sheet open={confirming} onClose={() => setConfirming(false)} title={groupMode === "FIXED" ? "Confirmar cobrança fixa" : "Confirmar cobranças"}>
        {groupMode === "FIXED" ? (
          <p className="text-ink-2">
            {description} · {brl(amount)} todo dia {fixedStart.slice(8, 10)} no crédito, a partir de {dmy(fixedStart)}. As próximas cobranças são criadas
            automaticamente; você pode encerrar quando quiser.
          </p>
        ) : (
          <p className="text-ink-2">
            {description} · {preview?.count} cobranças {periodicityText(periodicity, daysNum)} no crédito, total de {brl(preview?.total ?? 0)}.
          </p>
        )}
        {preview && (
          <ul className="panel flex flex-col gap-1.5 p-4 text-sm">
            {preview.rows.map((p) => (
              <li key={p.n} className="flex justify-between gap-3">
                <span className="text-ink-2">
                  {preview.count ? `${p.n}/${preview.count}` : `${p.n}ª`} · {dmy(p.due)}
                </span>
                <span className="num font-semibold">{brl(p.value)}</span>
              </li>
            ))}
            {preview.count && preview.count > PREVIEW_LIMIT && <li className="cap">… e mais {preview.count - PREVIEW_LIMIT}</li>}
          </ul>
        )}
        <button
          type="button"
          className="cta"
          disabled={busy}
          onClick={() =>
            guardBalance(groupMode === "INSTALLMENT" ? (preview?.total ?? amount) : amount, () => {
              setConfirming(false);
              confirmGroup();
            })
          }
        >
          {groupMode === "FIXED" ? "Criar cobrança fixa" : `Criar ${preview?.count ?? ""} cobranças`}
        </button>
        <button type="button" className="btn-ghost" onClick={() => setConfirming(false)}>
          Voltar e editar
        </button>
      </Sheet>

      <Sheet open={!!warn} onClose={() => setWarn(null)} title="Seu saldo vai zerar" alert>
        {warn && <BalanceWarning balance={data.balance} expense={warn.expense} />}
        <div className="flex gap-3">
          <button type="button" className="btn-ghost h-12 flex-1" onClick={() => setWarn(null)}>
            Cancelar
          </button>
          <button
            type="button"
            className="cta cta-danger h-12 flex-1 text-base"
            disabled={busy}
            onClick={() => {
              const save = warn?.save;
              setWarn(null);
              save?.();
            }}
          >
            Salvar
          </button>
        </div>
      </Sheet>
    </form>
  );
}
