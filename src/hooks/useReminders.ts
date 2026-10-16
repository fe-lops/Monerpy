"use client";

import { useMemo } from "react";
import { useReady } from "@/providers/DataProvider";
import { reminderCandidates } from "@/lib/domain/finance";
import type { ReminderStatus, Transaction } from "@/lib/domain/types";

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
