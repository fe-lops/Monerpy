"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Download, Search, SlidersHorizontal } from "lucide-react";
import { useReady } from "@/providers/DataProvider";
import { TxRow } from "@/components/transactions";
import { Empty, Field, PageHeader, Screen, ScopeSeg, Seg, Sheet } from "@/components/ui";
import { dayGroupLabel } from "@/lib/domain/dates";
import { applyFilter, displayDate, EMPTY_FILTER, type HistoryFilter } from "@/lib/domain/finance";
import { brl } from "@/lib/domain/money";
import { METHOD_LABEL } from "@/lib/domain/types";

export default function MovimentacoesPage() {
  const { transactions, categories, today, scope, setScope } = useReady();
  const [f, setF] = useState<HistoryFilter>(EMPTY_FILTER);
  const [open, setOpen] = useState(false);
  const filter = { ...f, scope };

  const list = useMemo(() => applyFilter(transactions, filter, categories), [transactions, categories, f, scope]); // eslint-disable-line react-hooks/exhaustive-deps
  const totals = useMemo(() => {
    let inc = 0;
    let out = 0;
    for (const t of list) {
      if (t.status !== "SETTLED") continue;
      if (t.type === "INCOME") inc += t.amount;
      else out += t.amount;
    }
    return { inc, out };
  }, [list]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof list>();
    for (const t of list) {
      const d = displayDate(t);
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(t);
    }
    return [...map.entries()];
  }, [list]);

  const activeCount = [f.from, f.to, f.status !== "ALL", f.categoryId !== "ALL", f.method !== "ALL"].filter(Boolean).length;
  const set = (patch: Partial<HistoryFilter>) => setF((prev) => ({ ...prev, ...patch }));

  const exportHref = `/exportar?${new URLSearchParams(
    Object.entries(filter)
      .filter(([, v]) => v && v !== "ALL")
      .map(([k, v]) => [k, String(v)]),
  )}`;

  return (
    <Screen>
      <PageHeader
        title="Movimentações"
        right={
          <Link href={exportHref} className="icon-btn" aria-label="Exportar CSV com estes filtros">
            <Download size={22} />
          </Link>
        }
      />
      <ScopeSeg value={scope} onChange={setScope} />

      <div className="flex gap-2">
        <label className="relative flex-1">
          <span className="sr-only">Buscar</span>
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-2" aria-hidden />
          <input className="field pl-10" type="search" placeholder="Buscar descrição ou categoria" value={f.q} onChange={(e) => set({ q: e.target.value })} />
        </label>
        <button type="button" className="chip h-[52px] rounded-xl px-4" aria-pressed={activeCount > 0} onClick={() => setOpen(true)} aria-label="Filtros">
          <SlidersHorizontal size={18} aria-hidden />
          {activeCount > 0 && <span className="num">{activeCount}</span>}
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto" role="group" aria-label="Tipo">
        {(
          [
            ["ALL", "Todas"],
            ["INCOME", "Entradas"],
            ["EXPENSE", "Saídas"],
          ] as const
        ).map(([v, l]) => (
          <button key={v} type="button" className="chip" aria-pressed={f.type === v} onClick={() => set({ type: v })}>
            {l}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="panel flex min-w-0 flex-col rounded-xl px-4 py-3">
          <small className="text-xs text-ink-2">Entradas liquidadas</small>
          <strong className="num font-display text-lg text-pos">{brl(totals.inc)}</strong>
        </div>
        <div className="panel flex min-w-0 flex-col rounded-xl px-4 py-3">
          <small className="text-xs text-ink-2">Saídas liquidadas</small>
          <strong className="num font-display text-lg text-neg">{brl(totals.out)}</strong>
        </div>
      </div>

      {groups.length ? (
        groups.map(([d, items]) => (
          <section key={d} className="flex flex-col gap-2.5">
            <h2 className="-mb-1 text-[13px] font-medium capitalize text-ink-2">{dayGroupLabel(d, today)}</h2>
            <ul className="list panel">
              {items.map((t) => (
                <TxRow key={t.id} tx={t} />
              ))}
            </ul>
          </section>
        ))
      ) : (
        <Empty>{transactions.length ? "Nenhuma movimentação com estes filtros." : "Nenhuma movimentação ainda. Toque em “Lançar” para começar."}</Empty>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="Filtros" closeOnBack>
        <div className="grid grid-cols-2 gap-3">
          <Field label="De">{(id) => <input id={id} type="date" className="field" value={f.from} onChange={(e) => set({ from: e.target.value })} />}</Field>
          <Field label="Até">{(id) => <input id={id} type="date" className="field" value={f.to} onChange={(e) => set({ to: e.target.value })} />}</Field>
        </div>
        <div>
          <span className="flabel">Status</span>
          <Seg
            label="Status"
            small
            value={f.status}
            onChange={(v) => set({ status: v })}
            options={[
              ["ALL", "Todos"],
              ["PENDING", "Pendente"],
              ["SETTLED", "Liquidado"],
              ["CANCELLED", "Cancelado"],
            ]}
          />
        </div>
        <Field label="Categoria">
          {(id) => (
            <select id={id} className="field" value={f.categoryId} onChange={(e) => set({ categoryId: e.target.value })}>
              <option value="ALL">Todas</option>
              {[...categories]
                .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.is_archived ? " (arquivada)" : ""}
                  </option>
                ))}
            </select>
          )}
        </Field>
        <Field label="Forma de pagamento">
          {(id) => (
            <select id={id} className="field" value={f.method} onChange={(e) => set({ method: e.target.value as HistoryFilter["method"] })}>
              <option value="ALL">Todas</option>
              {(Object.keys(METHOD_LABEL) as (keyof typeof METHOD_LABEL)[]).map((m) => (
                <option key={m} value={m}>
                  {METHOD_LABEL[m]}
                </option>
              ))}
            </select>
          )}
        </Field>
        <button type="button" className="cta" onClick={() => setOpen(false)}>
          Ver {list.length} {list.length === 1 ? "resultado" : "resultados"}
        </button>
        <button type="button" className="btn-ghost" onClick={() => setF({ ...EMPTY_FILTER, q: f.q, type: f.type })}>
          Limpar filtros
        </button>
      </Sheet>
    </Screen>
  );
}
