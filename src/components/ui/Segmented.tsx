"use client";

import Link from "next/link";
import type { ScopeFilter } from "@/lib/domain/types";

// Seletores em pílula do Design System: genérico (Seg), de contexto (ScopeSeg) e de navegação (ChipLink).

const SCOPES: [ScopeFilter, string][] = [
  ["ALL", "Todos"],
  ["BUSINESS", "Profissional"],
  ["PERSONAL", "Pessoal"],
];

export function ScopeSeg({ value, onChange, small }: { value: ScopeFilter; onChange: (s: ScopeFilter) => void; small?: boolean }) {
  return (
    <div className={`seg ${small ? "sm" : ""} lg:max-w-[420px]`} role="group" aria-label="Contexto">
      {SCOPES.map(([v, label]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  );
}

/** Seletor segmentado genérico. */
export function Seg<T extends string>({
  value,
  options,
  onChange,
  label,
  small,
}: {
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
  label: string;
  small?: boolean;
}) {
  return (
    <div className={`seg ${small ? "sm" : ""}`} role="group" aria-label={label}>
      {options.map(([v, l]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>
          {l}
        </button>
      ))}
    </div>
  );
}

export function ChipLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className="chip" aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}
