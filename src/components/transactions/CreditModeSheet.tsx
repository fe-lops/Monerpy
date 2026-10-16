"use client";

import { CalendarSync, ChevronRight, CreditCard, Repeat } from "lucide-react";
import { Sheet } from "@/components/ui";

/** Como o lançamento no crédito será cobrado. */
export type CreditMode = "SINGLE" | "INSTALLMENT" | "FIXED";

export const CREDIT_MODE_LABEL: Record<CreditMode, string> = {
  SINGLE: "Pagamento não recorrente",
  INSTALLMENT: "Parcelar ou repetir",
  FIXED: "Fixa mensal",
};

const OPTIONS: { mode: CreditMode; title: string; text: string; Icon: typeof CreditCard }[] = [
  { mode: "SINGLE", title: CREDIT_MODE_LABEL.SINGLE, text: "Cobrado uma única vez no crédito.", Icon: CreditCard },
  { mode: "INSTALLMENT", title: CREDIT_MODE_LABEL.INSTALLMENT, text: "Em parcelas, mensais ou em outra periodicidade.", Icon: Repeat },
  { mode: "FIXED", title: CREDIT_MODE_LABEL.FIXED, text: "Cobrado todo mês, no mesmo dia, até você encerrar.", Icon: CalendarSync },
];

/**
 * Janela de escolha ao ativar "Parcelar no crédito". Fechar sem escolher (X, fundo, Esc ou o
 * botão/gesto "voltar" do celular) chama `onClose` — o formulário desliga a opção.
 */
export function CreditModeSheet({ open, current, onChoose, onClose }: { open: boolean; current: CreditMode | null; onChoose: (m: CreditMode) => void; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Como será cobrado?" closeOnBack>
      <ul className="flex flex-col gap-2.5" role="list">
        {OPTIONS.map(({ mode, title, text, Icon }) => (
          <li key={mode}>
            <button
              type="button"
              onClick={() => onChoose(mode)}
              aria-pressed={current === mode}
              className="panel flex w-full items-center gap-3.5 p-4 text-left transition-colors hover:border-accent-ink aria-pressed:border-accent-ink"
            >
              <span className="grid size-11 flex-none place-items-center rounded-full bg-input text-accent-ink">
                <Icon size={22} aria-hidden />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-semibold">{title}</span>
                <span className="row-sub">{text}</span>
              </span>
              <ChevronRight size={18} className="flex-none text-ink-2" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
