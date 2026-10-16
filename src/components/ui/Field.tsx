"use client";

import { useId } from "react";
import { brl, maskBRLInput } from "@/lib/domain/money";

/** Rótulo + controle + dica/erro. O filho recebe o id para ligar o <label> ao campo. */
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
