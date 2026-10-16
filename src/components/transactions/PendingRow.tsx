"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useData } from "@/providers/DataProvider";
import { dm } from "@/lib/domain/dates";
import { dueLabel, isOverdue, pendingDate } from "@/lib/domain/finance";
import { brlSigned } from "@/lib/domain/money";
import type { Transaction } from "@/lib/domain/types";

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
          {tx.installment_group_id && tx.installment_count === null ? " · Fixa mensal" : ""}
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
