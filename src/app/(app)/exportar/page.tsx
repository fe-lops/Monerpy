"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { useReady } from "@/components/providers/DataProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Field, PageHeader, Screen, ScopeSeg, Seg } from "@/components/ui";
import { startOfMonth } from "@/lib/dates";
import { applyFilter, EMPTY_FILTER, toCSV, type HistoryFilter } from "@/lib/finance";
import { brl } from "@/lib/money";

/** Exportação CSV respeitando os filtros (critério de aceite §11). */
function ExportInner() {
  const { transactions, categories, today } = useReady();
  const toast = useToast();
  const params = useSearchParams();

  const [f, setF] = useState<HistoryFilter>(() => {
    const base: HistoryFilter = { ...EMPTY_FILTER, from: startOfMonth(today), to: today };
    if ([...params.keys()].length === 0) return base;
    const get = (k: keyof HistoryFilter) => params.get(k) ?? "";
    return {
      ...EMPTY_FILTER,
      q: get("q"),
      from: get("from"),
      to: get("to"),
      type: (get("type") || "ALL") as HistoryFilter["type"],
      status: (get("status") || "ALL") as HistoryFilter["status"],
      scope: (get("scope") || "ALL") as HistoryFilter["scope"],
      categoryId: get("categoryId") || "ALL",
      method: (get("method") || "ALL") as HistoryFilter["method"],
    };
  });
  const set = (p: Partial<HistoryFilter>) => setF((prev) => ({ ...prev, ...p }));
  const list = useMemo(() => applyFilter(transactions, f, categories), [transactions, f, categories]);
  const fromUrl = [...params.keys()].length > 0;

  function download() {
    const blob = new Blob([toCSV(list, categories)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `monerpy-${f.from || "inicio"}-a-${f.to || today}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast(`${list.length} movimentações exportadas.`);
  }

  return (
    <Screen>
      <PageHeader title="Exportar CSV" back={true} />
      {fromUrl && <p className="cap -mt-2">Filtros trazidos do histórico. Ajuste se quiser.</p>}
      <ScopeSeg value={f.scope} onChange={(s) => set({ scope: s })} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="De">{(id) => <input id={id} type="date" className="field" value={f.from} onChange={(e) => set({ from: e.target.value })} />}</Field>
        <Field label="Até">{(id) => <input id={id} type="date" className="field" value={f.to} onChange={(e) => set({ to: e.target.value })} />}</Field>
      </div>
      <div>
        <span className="flabel">Tipo</span>
        <Seg
          label="Tipo"
          small
          value={f.type}
          onChange={(v) => set({ type: v })}
          options={[
            ["ALL", "Todos"],
            ["INCOME", "Entradas"],
            ["EXPENSE", "Saídas"],
          ]}
        />
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
      <div className="panel flex items-center justify-between gap-3 p-4">
        <span className="text-ink-2">
          {list.length} {list.length === 1 ? "movimentação" : "movimentações"}
        </span>
        <span className="num font-semibold">{brl(list.reduce((s, t) => s + t.amount, 0))}</span>
      </div>
      <button type="button" className="cta" onClick={download} disabled={!list.length}>
        <Download size={20} aria-hidden /> Baixar CSV
      </button>
      <p className="cap">Arquivo separado por “;” com vírgula decimal — abre direto no Excel ou Google Planilhas.</p>
    </Screen>
  );
}

export default function ExportarPage() {
  return (
    <Suspense>
      <ExportInner />
    </Suspense>
  );
}
