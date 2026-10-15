"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useReady } from "@/components/providers/DataProvider";
import { addMonths, endOfMonth, monthLabel, startOfMonth } from "@/lib/dates";
import { reminderCandidates } from "@/lib/finance";
import type { ReminderStatus, Transaction } from "@/lib/types";

export const REMINDER_LEAD_DAYS = 3;

export interface ReminderItem {
  tx: Transaction;
  status: ReminderStatus;
}

/** Lembretes internos: pendências atrasadas ou vencendo em até 3 dias, com o status salvo. */
export function useReminders() {
  const { transactions, reminders, today } = useReady();
  return useMemo(() => {
    const byTx = new Map(reminders.map((r) => [r.transaction_id, r.status]));
    const items: ReminderItem[] = reminderCandidates(transactions, today, REMINDER_LEAD_DAYS).map((tx) => ({
      tx,
      status: byTx.get(tx.id) ?? "PENDING",
    }));
    return { items, unseen: items.filter((i) => i.status === "PENDING").length };
  }, [transactions, reminders, today]);
}

/** Período mensal navegável (filtro de período do dashboard e relatórios). */
export function useMonthPeriod() {
  const { today } = useReady();
  const [month, setMonth] = useState(startOfMonth(today));
  const from = month;
  const to = endOfMonth(month);
  const isCurrent = month === startOfMonth(today);
  const nav = (
    <div className="flex items-center justify-between gap-2">
      <button type="button" className="icon-btn" aria-label="Mês anterior" onClick={() => setMonth(addMonths(month, -1))}>
        <ChevronLeft size={22} />
      </button>
      <span className="text-[15px] font-semibold" aria-live="polite">
        {monthLabel(month)}
      </span>
      <button type="button" className="icon-btn" aria-label="Próximo mês" disabled={isCurrent} onClick={() => setMonth(addMonths(month, 1))} style={{ opacity: isCurrent ? 0.35 : 1 }}>
        <ChevronRight size={22} />
      </button>
    </div>
  );
  return { from, to, month, nav };
}
