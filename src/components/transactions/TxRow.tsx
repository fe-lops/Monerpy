"use client";

import Link from "next/link";
import { useData } from "@/providers/DataProvider";
import { dm } from "@/lib/domain/dates";
import { displayDate, isOverdue, pendingDate } from "@/lib/domain/finance";
import { brlSigned } from "@/lib/domain/money";
import type { Transaction } from "@/lib/domain/types";

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
            {tx.installment_group_id && tx.installment_count === null ? " · Fixa mensal" : ""}
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
