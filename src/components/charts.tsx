// Gráficos leves em CSS, no estilo do Design System (sem biblioteca externa).

import { brl } from "@/lib/money";

function niceTop(max: number): { top: number; step: number } {
  const reais = max / 100;
  const raw = reais / 4;
  const pow = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1))));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? pow * 10;
  return { top: Math.max(step, Math.ceil(reais / step) * step) * 100, step: step * 100 };
}

function short(cents: number): string {
  const r = cents / 100;
  if (r >= 1000) return `${(r / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return Math.round(r).toLocaleString("pt-BR");
}

/** Barras verticais de uma série (ex.: gastos por categoria). */
export function BarChart({ rows, label }: { rows: { name: string; total: number }[]; label: string }) {
  if (!rows.length) return null;
  const { top, step } = niceTop(rows[0].total);
  const ticks: number[] = [];
  for (let t = 0; t <= top; t += step) ticks.push(t);
  return (
    <div className="mt-3.5" role="img" aria-label={`${label}: ${rows.map((r) => `${r.name} ${brl(r.total)}`).join(", ")}`}>
      <div className="relative mt-[22px] h-[168px]">
        {ticks.map((t) => (
          <div key={t} className="absolute inset-x-0 border-t border-line" style={{ bottom: `${(t / top) * 100}%` }}>
            <span className="num absolute -top-[9px] left-0 w-[34px] bg-card text-[11px] leading-4 text-ink-2">{short(t)}</span>
          </div>
        ))}
        <div className="absolute inset-y-0 left-10 right-0 flex gap-1">
          {rows.map((r) => (
            <div key={r.name} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
              <div className="relative w-full max-w-[34px] rounded-t-md lg:max-w-[56px] bg-accent transition-[height] duration-500" style={{ height: `${(r.total / top) * 100}%` }}>
                <b className="num absolute -top-[18px] left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-medium leading-4">{short(r.total)}</b>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="ml-10 mt-2 flex gap-1">
        {rows.map((r) => (
          <span key={r.name} className="min-w-0 flex-1 truncate text-center text-[11px] leading-[14px] text-ink-2" title={r.name}>
            {r.name}
          </span>
        ))}
      </div>
    </div>
  );
}

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
