"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { CreditCard } from "lucide-react";
import { useReady } from "@/providers/DataProvider";
import { useToast } from "@/providers/ToastProvider";
import { TransactionForm } from "@/components/transactions";
import { useSettleFlow } from "@/components/transactions";
import { Empty, PageHeader, Screen, Sheet } from "@/components/ui";
import { dmy } from "@/lib/domain/dates";
import { dueLabel, isOverdue, pendingDate } from "@/lib/domain/finance";
import { brl } from "@/lib/domain/money";
import { METHOD_LABEL, SCOPE_LABEL, STATUS_LABEL } from "@/lib/domain/types";

export default function MovimentacaoPage() {
  const { id } = useParams<{ id: string }>();
  const { transactions, categoryName, today, reopen, cancel, restore } = useReady();
  const toast = useToast();
  const settle = useSettleFlow();
  const [editing, setEditing] = useState(false);
  const [askCancel, setAskCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const tx = transactions.find((t) => t.id === id);

  if (!tx) {
    return (
      <Screen size="narrow">
        <PageHeader title="Movimentação" back="/movimentacoes" />
        <Empty>Movimentação não encontrada.</Empty>
      </Screen>
    );
  }

  if (editing) {
    return (
      <Screen size="narrow">
        <PageHeader title="Editar" back={true} />
        <TransactionForm editing={tx} />
        <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>
          Descartar alterações
        </button>
      </Screen>
    );
  }

  const income = tx.type === "INCOME";
  const late = isOverdue(tx, today);
  const ref = pendingDate(tx);

  async function run(fn: () => Promise<unknown>, msg: string) {
    setBusy(true);
    try {
      await fn();
      toast(msg);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Não foi possível salvar.", { tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  const rows: [string, React.ReactNode][] = [
    ["Tipo", income ? "Entrada" : "Saída"],
    ["Contexto", SCOPE_LABEL[tx.scope]],
    ["Categoria", categoryName(tx.category_id)],
    ["Status", <span key="s" className={late ? "text-neg" : ""}>{late ? "Atrasada" : STATUS_LABEL[tx.status]}</span>],
    [income ? "Data prevista" : "Vencimento", ref ? `${dmy(ref)}${tx.status === "PENDING" ? ` · ${dueLabel(tx, today)}` : ""}` : "Sem data"],
    ["Data efetiva", tx.settled_at ? dmy(tx.settled_at) : "—"],
    [income ? "Forma de recebimento" : "Forma de pagamento", METHOD_LABEL[tx.payment_method]],
    ["Lançado em", dmy(tx.transaction_date)],
  ];
  if (tx.installment_number)
    rows.push(tx.installment_count ? ["Parcela", `${tx.installment_number} de ${tx.installment_count}`] : ["Cobrança", `Fixa mensal (${tx.installment_number}ª)`]);
  if (tx.cancelled_at) rows.push(["Cancelado em", dmy(tx.cancelled_at.slice(0, 10))]);

  return (
    <Screen size="narrow">
      <PageHeader title={income ? "Entrada" : "Saída"} back={true} />

      <section className="panel flex flex-col items-center gap-1 px-4 py-6 text-center">
        <span className="text-ink-2">{tx.description}</span>
        <span className={`num font-display text-[34px] font-bold leading-10 ${tx.status === "CANCELLED" ? "text-ink-2 line-through" : income ? "text-pos" : "text-neg"}`}>
          {brl(tx.amount)}
        </span>
      </section>

      <dl className="list panel">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 border-line px-4 py-3 [&+&]:border-t">
            <dt className="text-ink-2">{k}</dt>
            <dd className="text-right font-medium">{v}</dd>
          </div>
        ))}
      </dl>

      {tx.notes && (
        <section className="panel p-4">
          <h2 className="flabel">Observações</h2>
          <p className="whitespace-pre-wrap">{tx.notes}</p>
        </section>
      )}

      {tx.installment_group_id && (
        <Link href={`/movimentacoes/parcelamento/${tx.installment_group_id}`} className="panel flex items-center gap-3 p-4">
          <CreditCard size={20} className="text-ink-2" aria-hidden />
          <span className="font-medium">Ver todas as cobranças deste grupo</span>
        </Link>
      )}

      <div className="flex flex-col gap-3">
        {tx.status === "PENDING" && (
          <button type="button" className="cta" onClick={() => settle.open(tx)}>
            {income ? "Marcar como recebida" : "Marcar como paga"}
          </button>
        )}
        {tx.status !== "CANCELLED" && (
          <button type="button" className="btn-ghost" onClick={() => setEditing(true)}>
            Editar
          </button>
        )}
        {tx.status === "SETTLED" && (
          <button type="button" className="btn-ghost" disabled={busy} onClick={() => run(() => reopen(tx.id), "Voltou para pendente.")}>
            Desfazer {income ? "recebimento" : "pagamento"}
          </button>
        )}
        {tx.status !== "CANCELLED" ? (
          <button type="button" className="btn-ghost danger" onClick={() => setAskCancel(true)}>
            Cancelar lançamento
          </button>
        ) : (
          <button type="button" className="btn-ghost" disabled={busy} onClick={() => run(() => restore(tx.id), "Lançamento restaurado como pendente.")}>
            Restaurar como pendente
          </button>
        )}
      </div>

      <Sheet open={askCancel} onClose={() => setAskCancel(false)} title="Cancelar lançamento?" closeOnBack>
        <p className="text-ink-2">
          O lançamento continua no histórico como cancelado e deixa de contar no saldo e nas pendências. Você pode restaurá-lo depois.
        </p>
        <button
          type="button"
          className="cta"
          style={{ background: "var(--neg-chip)", color: "#fff" }}
          disabled={busy}
          onClick={async () => {
            await run(() => cancel(tx.id), "Lançamento cancelado.");
            setAskCancel(false);
          }}
        >
          Cancelar lançamento
        </button>
        <button type="button" className="btn-ghost" onClick={() => setAskCancel(false)}>
          Manter
        </button>
      </Sheet>
      {settle.sheet}
    </Screen>
  );
}
