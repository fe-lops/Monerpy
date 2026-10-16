"use client";

import { CalendarSync, CircleDot, CreditCard, Repeat } from "lucide-react";

/** Como o lançamento no crédito será cobrado. */
export type CreditMode = "SINGLE" | "INSTALLMENT" | "FIXED";

export const CREDIT_MODE_LABEL: Record<CreditMode, string> = {
  SINGLE: "Pagamento não recorrente",
  INSTALLMENT: "Parcelar ou repetir",
  FIXED: "Fixa mensal",
};

const OPTIONS: { mode: CreditMode; text: string; Icon: typeof CreditCard }[] = [
  { mode: "SINGLE", text: "Cobrado uma única vez no crédito", Icon: CircleDot },
  { mode: "INSTALLMENT", text: "Em parcelas, mensais ou em outra periodicidade", Icon: Repeat },
  { mode: "FIXED", text: "Todo mês, no mesmo dia, até você encerrar", Icon: CalendarSync },
];

/**
 * Escolha do tipo de cobrança no crédito: três cartões (radiogroup) que aparecem
 * quando a forma de pagamento é Crédito. Setas ↑ ↓ mudam a opção pelo teclado.
 */
export function CreditModePicker({ value, onChange }: { value: CreditMode; onChange: (m: CreditMode) => void }) {
  function onKeyDown(e: React.KeyboardEvent) {
    const i = OPTIONS.findIndex((o) => o.mode === value);
    if (e.key === "ArrowDown" || e.key === "ArrowRight") onChange(OPTIONS[(i + 1) % OPTIONS.length].mode);
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") onChange(OPTIONS[(i + OPTIONS.length - 1) % OPTIONS.length].mode);
    else return;
    e.preventDefault();
  }

  return (
    <div role="radiogroup" aria-label="Tipo de cobrança no crédito" className="flex flex-col gap-2.5" onKeyDown={onKeyDown}>
      {OPTIONS.map(({ mode, text, Icon }) => {
        const on = value === mode;
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(mode)}
            className={`flex w-full items-center gap-3 rounded-2xl border-2 bg-card px-4 py-3.5 text-left transition-colors ${
              on ? "border-accent-ink" : "border-line hover:border-[color-mix(in_srgb,var(--accent-ink)_50%,var(--border))]"
            }`}
          >
            <CreditCard size={24} strokeWidth={1.8} aria-hidden className={`flex-none transition-colors ${on ? "text-accent-ink" : "text-ink-2"}`} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-semibold">{CREDIT_MODE_LABEL[mode]}</span>
              <span className="row-sub">{text}</span>
            </span>
            <Icon size={22} strokeWidth={2} aria-hidden className={`flex-none transition-colors ${on ? "text-accent-ink" : "text-ink-2"}`} />
          </button>
        );
      })}
    </div>
  );
}
