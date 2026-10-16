"use client";

import { useParams } from "next/navigation";
import { useMemo } from "react";
import { useReady } from "@/components/providers/DataProvider";
import { PendingRow, TxRow, useSettleFlow } from "@/components/transactions";
import { Empty, PageHeader, Screen } from "@/components/ui";
import { brl } from "@/lib/money";
import { SCOPE_LABEL } from "@/lib/types";

/** Compra parcelada: cada parcela tem vencimento e status próprios (regra 15). */
export default function ParcelamentoPage() {
  const { id } = useParams<{ id: string }>();
  const { transactions, categoryName } = useReady();
  const settle = useSettleFlow();

  const parts = useMemo(
    () => transactions.filter((t) => t.installment_group_id === id).sort((a, b) => (a.installment_number ?? 0) - (b.installment_number ?? 0)),
    [transactions, id],
  );

  if (!parts.length) {
    return (
      <Screen size="narrow">
        <PageHeader title="Parcelamento" back="/movimentacoes" />
        <Empty>Compra parcelada não encontrada.</Empty>
      </Screen>
    );
  }

  const active = parts.filter((p) => p.status !== "CANCELLED");
  const total = active.reduce((s, p) => s + p.amount, 0);
  const paid = active.filter((p) => p.status === "SETTLED");
  const paidSum = paid.reduce((s, p) => s + p.amount, 0);
  const name = parts[0].description.replace(/\s*\(\d+\/\d+\)$/, "");

  return (
    <Screen size="narrow">
      <PageHeader title="Parcelamento" back={true} />
      <section className="panel flex flex-col gap-3 p-4">
        <div>
          <h2 className="sub">{name}</h2>
          <p className="cap">
            {categoryName(parts[0].category_id)} · {SCOPE_LABEL[parts[0].scope]} · Cartão de crédito
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col">
            <small className="text-xs text-ink-2">Valor total</small>
            <strong className="num font-display text-lg">{brl(total)}</strong>
          </div>
          <div className="flex flex-col">
            <small className="text-xs text-ink-2">Pago</small>
            <strong className="num font-display text-lg text-pos">
              {paid.length}/{active.length} · {brl(paidSum)}
            </strong>
          </div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-input" aria-hidden>
          <div className="h-full rounded-full bg-accent" style={{ width: `${total ? (paidSum / total) * 100 : 0}%` }} />
        </div>
      </section>

      <ul className="list panel">
        {parts.map((p) => (p.status === "PENDING" ? <PendingRow key={p.id} tx={p} onSettle={settle.open} /> : <TxRow key={p.id} tx={p} />))}
      </ul>
      {settle.sheet}
    </Screen>
  );
}
