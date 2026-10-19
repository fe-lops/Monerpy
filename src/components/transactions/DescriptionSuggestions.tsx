"use client";

import { useEffect, useRef } from "react";
import { brl } from "@/lib/domain/money";
import type { DescriptionSuggestion } from "@/lib/domain/suggestions";
import { METHOD_LABEL, SCOPE_LABEL } from "@/lib/domain/types";
import { categoryIcon } from "./categoryIcons";

interface Props {
  /** O campo de descrição; o bloco de sugestões abre logo abaixo dele. */
  children: React.ReactNode;
  suggestions: DescriptionSuggestion[];
  open: boolean;
  categoryName: (id: string | null) => string;
  onPick: (s: DescriptionSuggestion) => void;
  /** Toque fora do bloco (ou Esc): descarta as sugestões. */
  onDismiss: () => void;
}

/** Sugestões de lançamentos anteriores com nome parecido (ver lib/domain/suggestions.ts). */
export function DescriptionSuggestions({ children, suggestions, open, categoryName, onPick, onDismiss }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = open && suggestions.length > 0;

  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (!visible) return;
    const outside = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onDismissRef.current();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onDismissRef.current();
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", onKey);
    };
  }, [visible]);

  return (
    <div ref={ref} className="relative">
      {children}
      {visible && (
        <ul
          className="anim-fade absolute inset-x-0 top-full z-20 mt-1.5 flex max-h-[min(320px,50dvh)] flex-col overflow-y-auto rounded-2xl border border-line bg-card p-1.5 shadow-[0_18px_50px_rgb(0_0_0/.4)]"
          aria-label="Sugestões de lançamentos anteriores"
        >
          {suggestions.map((s) => {
            const Icon = categoryIcon(categoryName(s.tx.category_id));
            const method = s.group ? (s.group.kind === "FIXED" ? "Fixa mensal no crédito" : `Crédito em ${s.group.installment_count}x`) : METHOD_LABEL[s.tx.payment_method];
            const value = s.group ? s.group.total_amount : s.tx.amount;
            return (
              <li key={s.key}>
                <button
                  type="button"
                  onClick={() => onPick(s)}
                  className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--text)_6%,transparent)]"
                >
                  <span className="grid size-10 flex-none place-items-center rounded-full bg-input text-accent-ink">
                    <Icon size={19} aria-hidden />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-semibold">{s.description}</span>
                    <span className="truncate text-[13px] text-ink-2">
                      {categoryName(s.tx.category_id)} · {method} · {SCOPE_LABEL[s.tx.scope]}
                    </span>
                  </span>
                  <span className="num flex-none text-sm font-semibold">{brl(value)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
