import { brl } from "@/lib/domain/money";
import { niceTop } from "./scale";

/** Barras duplas entrada x saída por mês. */
export function InOutChart({ rows, label }: { rows: { label: string; income: number; expense: number }[]; label: string }) {
  const max = Math.max(1, ...rows.flatMap((r) => [r.income, r.expense]));
  const { top } = niceTop(max);
  return (
    <div role="img" aria-label={`${label}: ${rows.map((r) => `${r.label} entradas ${brl(r.income)}, saídas ${brl(r.expense)}`).join("; ")}`}>
      <div className="mt-4 flex h-[150px] items-end gap-2 border-b border-line">
        {rows.map((r) => (
          <div key={r.label} className="flex h-full min-w-0 flex-1 items-end justify-center gap-[3px]">
            <div className="w-full max-w-[14px] rounded-t bg-[var(--pos-ink)]" style={{ height: `${(r.income / top) * 100}%` }} />
            <div className="w-full max-w-[14px] rounded-t bg-[var(--neg-ink)]" style={{ height: `${(r.expense / top) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        {rows.map((r) => (
          <span key={r.label} className="min-w-0 flex-1 text-center text-[11px] leading-[14px] text-ink-2">
            {r.label}
          </span>
        ))}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-ink-2">
        <span className="flex items-center gap-1.5">
          <i className="inline-block size-2.5 rounded-sm bg-[var(--pos-ink)]" /> Entradas
        </span>
        <span className="flex items-center gap-1.5">
          <i className="inline-block size-2.5 rounded-sm bg-[var(--neg-ink)]" /> Saídas
        </span>
      </div>
    </div>
  );
}
