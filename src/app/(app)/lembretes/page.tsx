"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Eye } from "lucide-react";
import { REMINDER_LEAD_DAYS, useReminders, type ReminderItem } from "@/hooks";
import { useReady } from "@/providers/DataProvider";
import { useToast } from "@/providers/ToastProvider";
import { useSettleFlow } from "@/components/transactions";
import { Empty, PageHeader, Screen, SectionTitle, Seg } from "@/components/ui";
import { addDays } from "@/lib/domain/dates";
import { dueLabel, isOverdue, pendingDate } from "@/lib/domain/finance";
import { brl } from "@/lib/domain/money";
import type { ReminderStatus } from "@/lib/domain/types";

/** Lembretes internos (PRD regra 19): atrasadas e vencendo em até 3 dias; marcar como visto/concluído. */
export default function LembretesPage() {
  const { today, setReminder, categoryName } = useReady();
  const { items } = useReminders();
  const toast = useToast();
  const settle = useSettleFlow();
  const [view, setView] = useState<"open" | "done">("open");

  const open = items.filter((i) => i.status === "PENDING" || i.status === "SEEN");
  const done = items.filter((i) => i.status === "DONE");
  const shown = view === "open" ? open : done;
  const late = shown.filter((i) => isOverdue(i.tx, today));
  const soon = shown.filter((i) => !isOverdue(i.tx, today));

  async function mark(i: ReminderItem, status: ReminderStatus) {
    const at = `${addDays(pendingDate(i.tx)!, -REMINDER_LEAD_DAYS)}T09:00:00-03:00`;
    try {
      await setReminder(i.tx.id, at, status);
      if (status === "DONE") toast("Lembrete concluído.", { action: { label: "Desfazer", run: () => void setReminder(i.tx.id, at, "SEEN") } });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Não foi possível salvar.", { tone: "error" });
    }
  }

  const row = (i: ReminderItem) => {
    const income = i.tx.type === "INCOME";
    const isLate = isOverdue(i.tx, today);
    return (
      <li key={i.tx.id} className="flex flex-col gap-3 px-4 py-3.5">
        <Link href={`/movimentacoes/${i.tx.id}`} className="flex items-start justify-between gap-3">
          <span className="flex min-w-0 flex-col">
            <span className="flex items-center gap-2">
              {i.status === "PENDING" && <span className="size-2 flex-none rounded-full bg-neg-chip" aria-label="Novo" />}
              <span className="row-name">{i.tx.description}</span>
            </span>
            <span className={`row-sub ${isLate ? "text-neg" : ""}`}>
              {income ? "Receber" : "Pagar"} · {dueLabel(i.tx, today)} · {categoryName(i.tx.category_id)}
            </span>
          </span>
          <span className={`amt ${income ? "pos" : "neg"}`}>{brl(i.tx.amount)}</span>
        </Link>
        {view === "open" && (
          <div className="flex gap-2">
            <button type="button" className="chip" onClick={() => settle.open(i.tx)}>
              <Check size={16} aria-hidden /> {income ? "Recebi" : "Paguei"}
            </button>
            {i.status === "PENDING" && (
              <button type="button" className="chip" onClick={() => mark(i, "SEEN")}>
                <Eye size={16} aria-hidden /> Visto
              </button>
            )}
            <button type="button" className="chip" onClick={() => mark(i, "DONE")}>
              Concluir
            </button>
          </div>
        )}
      </li>
    );
  };

  return (
    <Screen>
      <PageHeader title="Lembretes" back="/mais" />
      <p className="cap -mt-2">Contas atrasadas e que vencem nos próximos {REMINDER_LEAD_DAYS} dias. Avisos aparecem apenas dentro do app.</p>
      <Seg
        label="Visualização"
        small
        value={view}
        onChange={setView}
        options={[
          ["open", `Ativos (${open.length})`],
          ["done", `Concluídos (${done.length})`],
        ]}
      />
      {shown.length === 0 && <Empty>{view === "open" ? "Nenhum lembrete agora. Tudo em dia!" : "Nenhum lembrete concluído."}</Empty>}
      {late.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <SectionTitle tone="late">Atrasadas</SectionTitle>
          <ul className="list panel">{late.map(row)}</ul>
        </section>
      )}
      {soon.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <SectionTitle>Vencendo em breve</SectionTitle>
          <ul className="list panel">{soon.map(row)}</ul>
        </section>
      )}
      {settle.sheet}
    </Screen>
  );
}
