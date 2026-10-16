"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useReady } from "@/providers/DataProvider";
import { addMonths, endOfMonth, monthLabel, startOfMonth } from "@/lib/domain/dates";

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
