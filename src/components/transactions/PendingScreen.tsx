"use client";

import { useMemo } from "react";
import { useReady } from "@/providers/DataProvider";
import { PendingRow } from "./PendingRow";
import { useSettleFlow } from "./useSettleFlow";
import { ChipLink, Empty, PageHeader, Screen, ScopeSeg, SectionTitle } from "@/components/ui";
import { BUCKET_LABEL, bucketPending, inScope, type BucketKey } from "@/lib/domain/finance";
import { brl } from "@/lib/domain/money";

type Kind = "all" | "pagar" | "receber";

const ORDER: BucketKey[] = ["overdue", "today", "week", "future", "nodate"];

/** Contas a pagar/receber agrupadas por atraso e vencimento (PRD §5). */
export function PendingScreen({ kind }: { kind: Kind }) {
  const { transactions, today, scope, setScope } = useReady();
  const settle = useSettleFlow();

  const list = useMemo(
    () =>
      transactions.filter(
        (t) => t.status === "PENDING" && inScope(t, scope) && (kind === "all" || (kind === "pagar" ? t.type === "EXPENSE" : t.type === "INCOME")),
      ),
    [transactions, scope, kind],
  );
  const buckets = useMemo(() => bucketPending(list, today), [list, today]);
  const total = list.reduce((s, t) => s + (t.type === "INCOME" ? t.amount : -t.amount), 0);
  const title = kind === "pagar" ? "Contas a pagar" : kind === "receber" ? "Contas a receber" : "Pendências";

  return (
    <Screen>
      <PageHeader title={title} />
      <ScopeSeg value={scope} onChange={setScope} />
      <div className="flex gap-2 overflow-x-auto">
        <ChipLink href="/pendencias" active={kind === "all"}>
          Todas
        </ChipLink>
        <ChipLink href="/contas-a-pagar" active={kind === "pagar"}>
          A pagar
        </ChipLink>
        <ChipLink href="/contas-a-receber" active={kind === "receber"}>
          A receber
        </ChipLink>
      </div>

      {list.length > 0 && (
        <p className="cap">
          {list.length} {list.length === 1 ? "pendência" : "pendências"} ·{" "}
          {kind === "all" ? (
            <>
              saldo previsto <span className="num font-semibold text-ink">{brl(total)}</span>
            </>
          ) : (
            <>
              total <span className="num font-semibold text-ink">{brl(Math.abs(total))}</span>
            </>
          )}
        </p>
      )}

      {list.length ? (
        ORDER.filter((k) => buckets[k].length).map((k) => (
          <section key={k} className="flex flex-col gap-2.5">
            <SectionTitle tone={k === "overdue" ? "late" : undefined} right={`${buckets[k].length} ${buckets[k].length === 1 ? "conta" : "contas"}`}>
              {BUCKET_LABEL[k]}
            </SectionTitle>
            <ul className="list panel">
              {buckets[k].map((t) => (
                <PendingRow key={t.id} tx={t} onSettle={settle.open} />
              ))}
            </ul>
          </section>
        ))
      ) : (
        <Empty>Nada pendente por aqui. Use o botão “Lançar” para adicionar uma conta ou uma receita prevista.</Empty>
      )}
      {settle.sheet}
    </Screen>
  );
}
