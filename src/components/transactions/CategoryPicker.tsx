"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Sheet } from "@/components/ui";
import type { Category } from "@/lib/domain/types";
import { categoryIcon } from "./categoryIcons";

interface Props {
  id?: string;
  /** Categorias já filtradas e ordenadas (ver selectableCategories). */
  options: Category[];
  value: string;
  onChange: (id: string) => void;
  invalid?: boolean;
}

/**
 * Campo de categoria: mostra a escolhida e abre uma janela (por cima do formulário, fundo escurecido)
 * com as categorias em botões enfileirados, cada uma com um ícone. Rola quando há muitas opções.
 */
export function CategoryPicker({ id, options, value, onChange, invalid }: Props) {
  const [open, setOpen] = useState(false);
  const selected = options.find((c) => c.id === value);
  const SelectedIcon = selected ? categoryIcon(selected.name) : null;

  return (
    <>
      <button
        id={id}
        type="button"
        className={`field flex items-center gap-3 text-left ${invalid ? "border-[var(--neg-ink)]" : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        {SelectedIcon && <SelectedIcon size={20} className="flex-none text-accent-ink" aria-hidden />}
        <span className={`min-w-0 flex-1 truncate ${selected ? "" : "text-ink-2"}`}>{selected?.name ?? "Selecione a categoria"}</span>
        <ChevronDown size={18} className="flex-none text-ink-2" aria-hidden />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Selecione a categoria" closeOnBack compact>
        <ul className="flex flex-col gap-2" role="listbox" aria-label="Categorias">
          {options.map((c) => {
            const Icon = categoryIcon(c.name);
            const on = c.id === value;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => {
                    onChange(c.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-3.5 rounded-2xl border-2 bg-card px-3 py-2.5 text-left transition-colors ${
                    on ? "border-accent-ink" : "border-line hover:border-[color-mix(in_srgb,var(--accent-ink)_50%,var(--border))]"
                  }`}
                >
                  <span className={`grid size-11 flex-none place-items-center rounded-full ${on ? "bg-accent text-on-accent" : "bg-input text-ink-2"}`}>
                    <Icon size={20} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{c.name}</span>
                  {on && <Check size={20} className="flex-none text-accent-ink" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      </Sheet>
    </>
  );
}
