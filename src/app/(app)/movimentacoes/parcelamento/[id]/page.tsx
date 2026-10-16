"use client";

import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { PendingRow, TxRow, useSettleFlow } from "@/components/transactions";
import { Empty, PageHeader, Screen, Sheet } from "@/components/ui";
import { dmy } from "@/lib/domain/dates";
import { brl } from "@/lib/domain/money";
import { futurePendingOfGroup, periodicityText } from "@/lib/domain/recurrence";
import { SCOPE_LABEL } from "@/lib/domain/types";
import { useReady } from "@/providers/DataProvider";
import { useToast } from "@/providers/ToastProvider";

/**
 * Grupo de cobranças no crédito: parcelado/repetido (N cobranças com periodicidade) ou fixa mensal.
 * Cada cobrança tem vencimento e status próprios (regra 15).
 */
export default function GrupoDeCobrancasPage() {
  const { id } = useParams<{ id: string }>();
  const { transactions, groups, categoryName, today, endGroup } = useReady();
  const toast = useToast();
  const settle = useSettleFlow();
  const [askEnd, setAskEnd] = useState(false);
  const [busy, setBusy] = useState(false);

  const group = groups.find((g) => g.id === id);
  const parts = useMemo(
    () => transactions.filter((t) => t.installment_group_id === id).sort((a, b) => (a.installment_number ?? 0) - (b.installment_number ?? 0)),
    [transactions, id],
  );

  if (!parts.length) {
    return (
      <Screen size="narrow">
        <PageHeader title="Cobranças" back="/movimentacoes" />
        <Empty>Grupo de cobranças não encontrado.</Empty>
      </Screen>
    );
  }

  const fixed = group?.kind === "FIXED";
  const income = parts[0].type === "INCOME";
  const active = parts.filter((p) => p.status !== "CANCELLED");
  const total = active.reduce((s, p) => s + p.amount, 0);
  const paid = active.filter((p) => p.status === "SETTLED");
  const paidSum = paid.reduce((s, p) => s + p.amount, 0);
  const name = group?.description || parts[0].description.replace(/\s*\(\d+\/\d+\)$/, "");
  const future = futurePendingOfGroup(id, transactions, today);
  const how = fixed
    ? `Fixa mensal · todo dia ${group!.first_due_date.slice(8, 10)}${group!.active ? "" : " · encerrada"}`
    : group
      ? `${group.installment_count} cobranças · ${periodicityText(group.periodicity, group.interval_days)}`
      : `${parts.length} parcelas`;

  async function end() {
    setBusy(true);
    try {
      await endGroup(id);
      toast(future.length ? `Cobrança fixa encerrada. ${future.length} cobrança(s) futura(s) cancelada(s).` : "Cobrança fixa encerrada.");
      setAskEnd(false);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Não foi possível encerrar.", { tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen size="narrow">
      <PageHeader title={fixed ? "Cobrança fixa" : "Parcelamento"} back={true} />
      <section className="panel flex flex-col gap-3 p-4">
        <div>
          <h2 className="sub">{name}</h2>
          <p className="cap">
            {categoryName(parts[0].category_id)} · {SCOPE_LABEL[parts[0].scope]} · {income ? "Entrada" : "Saída"} no crédito
          </p>
          <p className="cap">{how}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col">
            <small className="text-xs text-ink-2">{fixed ? "Valor mensal" : "Valor total"}</small>
            <strong className="num font-display text-lg">{brl(fixed ? (group?.total_amount ?? parts[0].amount) : total)}</strong>
          </div>
          <div className="flex flex-col">
            <small className="text-xs text-ink-2">{income ? "Recebido" : "Pago"}</small>
            <strong className="num font-display text-lg text-pos">
              {paid.length}/{active.length} · {brl(paidSum)}
            </strong>
          </div>
        </div>
        {!fixed && (
          <div className="h-2 overflow-hidden rounded-full bg-input" aria-hidden>
            <div className="h-full rounded-full bg-accent" style={{ width: `${total ? (paidSum / total) * 100 : 0}%` }} />
          </div>
        )}
        {fixed && group?.active && <p className="cap">As próximas cobranças aparecem automaticamente, até 2 meses à frente.</p>}
      </section>

      <ul className="list panel">
        {parts.map((p) => (p.status === "PENDING" ? <PendingRow key={p.id} tx={p} onSettle={settle.open} /> : <TxRow key={p.id} tx={p} />))}
      </ul>

      {fixed && group?.active && (
        <button type="button" className="btn-ghost danger" onClick={() => setAskEnd(true)}>
          Encerrar cobrança fixa
        </button>
      )}

      <Sheet open={askEnd} onClose={() => setAskEnd(false)} title="Encerrar cobrança fixa?" closeOnBack>
        <p className="text-ink-2">
          Nenhuma nova cobrança será criada.{" "}
          {future.length > 0
            ? `${future.length} cobrança(s) futura(s) pendente(s) — a partir de ${dmy((future[0].due_date ?? future[0].expected_date)!)} — serão canceladas.`
            : "Não há cobranças futuras pendentes."}{" "}
          O histórico continua salvo.
        </p>
        <button type="button" className="cta" style={{ background: "var(--expense-solid)", color: "#fff" }} disabled={busy} onClick={end}>
          Encerrar cobrança
        </button>
        <button type="button" className="btn-ghost" onClick={() => setAskEnd(false)}>
          Manter
        </button>
      </Sheet>
      {settle.sheet}
    </Screen>
  );
}
