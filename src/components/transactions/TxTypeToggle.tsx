"use client";

import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { TxType } from "@/lib/domain/types";

const OPTIONS: { type: TxType; kind: "expense" | "income"; label: string; Icon: typeof ArrowUpRight }[] = [
  { type: "EXPENSE", kind: "expense", label: "Saída", Icon: ArrowUpRight },
  { type: "INCOME", kind: "income", label: "Entrada", Icon: ArrowDownLeft },
];

/**
 * Seletor Entrada/Saída do lançamento.
 * Vermelho = dinheiro saindo (gasto); verde = dinheiro entrando (recebimento).
 * A pílula colorida desliza entre as opções (estilos em globals.css → .type-toggle).
 */
export function TxTypeToggle({ value, onChange }: { value: TxType; onChange: (t: TxType) => void }) {
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft") onChange("EXPENSE");
    if (e.key === "ArrowRight") onChange("INCOME");
  }

  return (
    <div className="type-toggle" role="radiogroup" aria-label="Tipo de lançamento" data-type={value === "INCOME" ? "income" : "expense"} onKeyDown={onKeyDown}>
      <span className="type-toggle__thumb" aria-hidden />
      {OPTIONS.map(({ type, kind, label, Icon }) => {
        const checked = value === type;
        return (
          <button key={type} type="button" role="radio" aria-checked={checked} tabIndex={checked ? 0 : -1} data-kind={kind} onClick={() => onChange(type)}>
            <Icon size={18} strokeWidth={2.4} aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
