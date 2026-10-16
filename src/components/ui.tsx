"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef } from "react";
import { ChevronLeft, X } from "lucide-react";
import { maskBRLInput, brl } from "@/lib/money";
import type { ScopeFilter } from "@/lib/types";

const SCREEN_WIDTH = {
  narrow: "lg:max-w-[640px]", // formulários e detalhes
  default: "lg:max-w-[960px]", // listas
  wide: "lg:max-w-[1200px]", // painéis em grade
};

/** Contêiner de tela: largura de celular; no computador, largura conforme o tipo de tela. */
export function Screen({ children, className = "", size = "default" }: { children: React.ReactNode; className?: string; size?: keyof typeof SCREEN_WIDTH }) {
  return (
    <main className={`mx-auto flex w-full max-w-[480px] flex-col gap-5 px-5 pb-12 pt-4 md:max-w-[640px] lg:gap-6 lg:px-10 lg:pb-16 lg:pt-8 ${SCREEN_WIDTH[size]} ${className}`}>
      {children}
    </main>
  );
}

export function PageHeader({ title, back, right }: { title: string; back?: string | true; right?: React.ReactNode }) {
  const router = useRouter();
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-1">
        {back && (
          <button
            type="button"
            className="icon-btn -ml-2"
            aria-label="Voltar"
            onClick={() => (back === true ? router.back() : router.push(back))}
          >
            <ChevronLeft size={26} />
          </button>
        )}
        <h1 className="title truncate">{title}</h1>
      </div>
      {right}
    </div>
  );
}

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

export function Field({ label, error, children, hint }: { label: string; error?: string; hint?: string; children: (id: string) => React.ReactNode }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="flabel">
        {label}
      </label>
      {children(id)}
      {hint && !error && <p className="cap mt-1.5">{hint}</p>}
      {error && <p className="error mt-1.5">{error}</p>}
    </div>
  );
}

/** Campo de valor com máscara de moeda (dígitos viram centavos). */
export function MoneyInput({
  id,
  cents,
  onChange,
  big,
  invalid,
  autoFocus,
}: {
  id?: string;
  cents: number;
  onChange: (cents: number) => void;
  big?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <input
      id={id}
      className={`${big ? "valor" : "field"} num`}
      inputMode="numeric"
      autoComplete="off"
      placeholder="R$ 0,00"
      value={cents ? brl(cents) : ""}
      aria-invalid={invalid || undefined}
      autoFocus={autoFocus}
      onChange={(e) => onChange(maskBRLInput(e.target.value).cents)}
    />
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="panel px-5 py-7 text-center text-sm text-ink-2">{children}</div>;
}

export function SectionTitle({ children, right, tone }: { children: React.ReactNode; right?: React.ReactNode; tone?: "late" }) {
  return (
    <h2 className={`-mb-2 flex items-baseline justify-between text-sm font-semibold ${tone === "late" ? "text-neg" : ""}`}>
      <span>{children}</span>
      {right && <small className="text-[13px] font-normal text-ink-2">{right}</small>}
    </h2>
  );
}

/** Folha inferior modal (padrão do Design System para formulários rápidos). */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    // Celular: folha que sobe da base. Computador: modal centralizado.
    <div className="fixed inset-0 z-40 flex items-end justify-center lg:items-center lg:p-6">
      <div className="anim-fade absolute inset-0" style={{ background: "var(--scrim)" }} onClick={onClose} />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="anim-sheet relative flex max-h-[92dvh] w-full max-w-[480px] flex-col gap-4 overflow-y-auto rounded-t-3xl border-t border-line bg-card px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-5 outline-none md:max-w-[560px] lg:max-h-[85dvh] lg:rounded-3xl lg:border lg:px-7 lg:pb-7 lg:pt-6 lg:shadow-[0_30px_80px_rgb(0_0_0/.45)]"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-bold">{title}</h2>
          <button type="button" className="icon-btn" aria-label="Fechar" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        {children}
      </div>
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

export function Spinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Carregando">
      <span className="size-8 animate-spin rounded-full border-[3px] border-line border-t-accent" />
    </div>
  );
}
