"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";
import { useData } from "@/providers/DataProvider";
import { useToast } from "@/providers/ToastProvider";
import { Field, Seg, Sheet } from "@/components/ui";
import { dmy } from "@/lib/domain/dates";
import { pendingDate } from "@/lib/domain/finance";
import { brl } from "@/lib/domain/money";
import { SCOPE_LABEL, type PaymentMethod, type Transaction } from "@/lib/domain/types";

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
    <Sheet open={!!tx} onClose={() => setTx(null)} closeOnBack title={income ? "Confirmar recebimento" : "Confirmar pagamento"}>
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
                <CreditCard size={14} aria-hidden />
                {tx.installment_count
                  ? `Parcela ${tx.installment_number}/${tx.installment_count} no crédito. As demais continuam pendentes.`
                  : "Cobrança fixa mensal no crédito. As próximas continuam pendentes."}
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
