"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, CreditCard } from "lucide-react";
import { useData } from "@/components/providers/DataProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Field, Seg, Sheet } from "@/components/ui";
import { dm, dmy } from "@/lib/dates";
import { displayDate, dueLabel, isOverdue, pendingDate } from "@/lib/finance";
import { brl, brlSigned } from "@/lib/money";
import { METHOD_LABEL, SCOPE_LABEL, type PaymentMethod, type Transaction } from "@/lib/types";

/** Linha de histórico: descrição, categoria · data, valor com sinal. */
export function TxRow({ tx }: { tx: Transaction }) {
  const { categoryName, today } = useData();
  const income = tx.type === "INCOME";
  const late = isOverdue(tx, today);
  const date = displayDate(tx);
  const status =
    tx.status === "CANCELLED" ? "Cancelado" : tx.status === "PENDING" ? (late ? "Atrasado" : pendingDate(tx) ? "Previsto" : "Sem data") : null;
  return (
    <li>
      <Link href={`/movimentacoes/${tx.id}`} className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-[color-mix(in_srgb,var(--text)_4%,transparent)]">
        <div className="flex min-w-0 flex-col">
          <span className="row-name">{tx.description || categoryName(tx.category_id)}</span>
          <span className="row-sub truncate">
            {categoryName(tx.category_id)} · {dm(date)}
            {tx.scope === "PERSONAL" ? " · Pessoal" : ""}
            {status && <span className={late ? "text-neg" : ""}> · {status}</span>}
          </span>
        </div>
        <span className={`amt ${tx.status === "CANCELLED" ? "muted" : tx.status === "PENDING" ? "text-ink-2" : income ? "pos" : "neg"}`}>
          {brlSigned(tx.amount, income)}
        </span>
      </Link>
    </li>
  );
}

/** Linha de pendência com botão circular para dar baixa. */
export function PendingRow({ tx, onSettle }: { tx: Transaction; onSettle: (tx: Transaction) => void }) {
  const { categoryName, today } = useData();
  const income = tx.type === "INCOME";
  const late = isOverdue(tx, today);
  const d = pendingDate(tx);
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3.5">
      <Link href={`/movimentacoes/${tx.id}`} className="flex min-w-0 flex-col">
        {late && <span className="text-[11px] font-semibold leading-[14px] tracking-[.06em] text-neg">ATRASADA</span>}
        <span className="row-name">{tx.description || categoryName(tx.category_id)}</span>
        <span className="row-sub truncate">
          {categoryName(tx.category_id)} · {d ? `${income ? "Prev." : "Venc."} ${dm(d)}` : "Sem data"}
          {d && ` · ${dueLabel(tx, today).replace(/^Vence /, "").replace(/^Venceu /, "")}`}
          {tx.scope === "PERSONAL" ? " · Pessoal" : ""}
        </span>
      </Link>
      <div className="flex flex-none items-center gap-3">
        <span className={`amt ${income ? "pos" : "neg"}`}>{brlSigned(tx.amount, income)}</span>
        <button
          type="button"
          className="check"
          aria-label={`${income ? "Marcar como recebida" : "Marcar como paga"}: ${tx.description}`}
          onClick={() => onSettle(tx)}
        >
          <Check size={18} strokeWidth={2.6} aria-hidden />
        </button>
      </div>
    </li>
  );
}

const METHODS: [Exclude<PaymentMethod, "UNSPECIFIED">, string][] = [
  ["PIX", "Pix"],
  ["DEBIT_CARD", "Débito"],
  ["CREDIT_CARD", "Crédito"],
];

/**
 * Regra 8: ao liquidar, pedir data efetiva (padrão hoje) e forma de pagamento/recebimento.
 * Usado por Pendências, Dashboard, Lembretes e Detalhe.
 */
export function useSettleFlow() {
  const { settle, reopen, today } = useData();
  const toast = useToast();
  const [tx, setTx] = useState<Transaction | null>(null);
  const [date, setDate] = useState(today);
  const [method, setMethod] = useState<Exclude<PaymentMethod, "UNSPECIFIED">>("PIX");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function open(t: Transaction) {
    setTx(t);
    setDate(today);
    setMethod(t.payment_method === "UNSPECIFIED" ? "PIX" : t.payment_method);
    setErr("");
  }

  async function confirm() {
    if (!tx || busy) return;
    if (!date) return setErr("Informe a data efetiva.");
    if (date > today) return setErr("A data efetiva não pode estar no futuro.");
    setBusy(true);
    try {
      const done = await settle(tx.id, date, method);
      setTx(null);
      toast(`${done.type === "INCOME" ? "Recebido" : "Pago"}: ${done.description} · ${brl(done.amount)}`, {
        action: { label: "Desfazer", run: () => void reopen(done.id) },
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  const income = tx?.type === "INCOME";
  const sheet = (
    <Sheet open={!!tx} onClose={() => setTx(null)} title={income ? "Confirmar recebimento" : "Confirmar pagamento"}>
      {tx && (
        <>
          <div className="panel flex items-center justify-between gap-3 p-4">
            <div className="flex min-w-0 flex-col">
              <span className="row-name">{tx.description}</span>
              <span className="row-sub">
                {SCOPE_LABEL[tx.scope]}
                {pendingDate(tx) ? ` · ${income ? "previsto" : "vence"} ${dmy(pendingDate(tx)!)}` : ""}
              </span>
            </div>
            <span className={`amt ${income ? "pos" : "neg"}`}>{brl(tx.amount)}</span>
          </div>
          <Field label={income ? "Data do recebimento" : "Data do pagamento"}>
            {(id) => <input id={id} type="date" className="field" value={date} max={today} onChange={(e) => setDate(e.target.value)} />}
          </Field>
          <div>
            <span className="flabel">{income ? "Forma de recebimento" : "Forma de pagamento"}</span>
            <Seg label="Forma de pagamento" value={method} options={METHODS} onChange={setMethod} />
            {tx.installment_group_id && (
              <p className="cap mt-2 flex items-center gap-1.5">
                <CreditCard size={14} aria-hidden /> Parcela {tx.installment_number}/{tx.installment_count} no {METHOD_LABEL.CREDIT_CARD.toLowerCase()}. As demais continuam pendentes.
              </p>
            )}
          </div>
          {err && (
            <p className="error" role="alert">
              {err}
            </p>
          )}
          <button type="button" className="cta" disabled={busy} onClick={confirm}>
            {income ? "Marcar como recebida" : "Marcar como paga"}
          </button>
        </>
      )}
    </Sheet>
  );

  return { open, sheet };
}
