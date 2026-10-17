"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { categoryIcon } from "@/components/transactions";
import { useReady } from "@/providers/DataProvider";
import { useToast } from "@/providers/ToastProvider";
import { Empty, Field, PageHeader, Screen, SectionTitle, Seg, Sheet } from "@/components/ui";
import { categorySchema, fieldErrors } from "@/lib/domain/schemas";
import type { Category, Scope, TxType } from "@/lib/domain/types";

interface Draft {
  id?: string;
  name: string;
  transaction_type: TxType;
  /** Mantido no banco por compatibilidade; a interface não divide mais por contexto. */
  default_scope: Scope;
}

/**
 * Categorias: lista única por tipo (Saídas / Entradas), sem divisão profissional/pessoal.
 * Criar, editar e arquivar (arquivadas ficam no histórico, mas não em novos lançamentos).
 */
export default function CategoriasPage() {
  const { categories, transactions, createCategory, updateCategory } = useReady();
  const toast = useToast();
  const [type, setType] = useState<TxType>("EXPENSE");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const usage = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of transactions) if (t.category_id) m.set(t.category_id, (m.get(t.category_id) ?? 0) + 1);
    return m;
  }, [transactions]);

  const list = categories.filter((c) => c.transaction_type === type).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const active = list.filter((c) => !c.is_archived);
  const archived = list.filter((c) => c.is_archived);

  async function save() {
    if (!draft || busy) return;
    const parsed = categorySchema.safeParse(draft);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    const dup = categories.some(
      (c) => c.id !== draft.id && c.transaction_type === draft.transaction_type && c.name.trim().toLowerCase() === parsed.data.name.toLowerCase(),
    );
    if (dup) return setErrors({ name: "Já existe uma categoria com esse nome." });
    setBusy(true);
    try {
      if (draft.id) await updateCategory(draft.id, parsed.data);
      else await createCategory(parsed.data);
      toast(draft.id ? "Categoria atualizada." : "Categoria criada.");
      setDraft(null);
    } catch (e) {
      setErrors({ name: e instanceof Error ? e.message : "Não foi possível salvar." });
    } finally {
      setBusy(false);
    }
  }

  async function toggleArchive(c: Category) {
    try {
      await updateCategory(c.id, { is_archived: !c.is_archived });
      toast(c.is_archived ? `“${c.name}” reativada.` : `“${c.name}” arquivada.`, {
        action: { label: "Desfazer", run: () => void updateCategory(c.id, { is_archived: c.is_archived }) },
      });
      setDraft(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Não foi possível salvar.", { tone: "error" });
    }
  }

  const row = (c: Category) => {
    const Icon = categoryIcon(c.name);
    return (
    <li key={c.id}>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-[color-mix(in_srgb,var(--text)_5%,transparent)]"
        onClick={() => {
          setErrors({});
          setDraft({ id: c.id, name: c.name, transaction_type: c.transaction_type, default_scope: c.default_scope });
        }}
      >
        <span className="grid size-10 flex-none place-items-center rounded-full bg-input text-ink-2">
          <Icon size={18} aria-hidden />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className={`row-name ${c.is_archived ? "text-ink-2" : ""}`}>{c.name}</span>
          <span className="row-sub">{usage.get(c.id) ?? 0} lançamentos</span>
        </span>
        <Pencil size={18} className="flex-none text-ink-2" aria-hidden />
      </button>
    </li>
    );
  };

  const editingCat = draft?.id ? categories.find((c) => c.id === draft.id) : undefined;

  return (
    <Screen>
      <PageHeader
        title="Categorias"
        back="/mais"
        right={
          <button
            type="button"
            className="icon-btn"
            aria-label="Nova categoria"
            onClick={() => {
              setErrors({});
              setDraft({ name: "", transaction_type: type, default_scope: "PERSONAL" });
            }}
          >
            <Plus size={24} />
          </button>
        }
      />
      <div className="lg:max-w-[360px]">
      <Seg
        label="Tipo"
        value={type}
        onChange={setType}
        options={[
          ["EXPENSE", "Saídas"],
          ["INCOME", "Entradas"],
        ]}
      />
      </div>
      <section className="flex flex-col gap-2.5">
        <SectionTitle right={`${active.length}`}>{type === "EXPENSE" ? "Categorias de saída" : "Categorias de entrada"}</SectionTitle>
        {active.length ? <ul className="list panel">{active.map(row)}</ul> : <Empty>Nenhuma categoria.</Empty>}
      </section>
      {archived.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <SectionTitle right={`${archived.length}`}>Arquivadas</SectionTitle>
          <ul className="list panel">{archived.map(row)}</ul>
        </section>
      )}

      <Sheet open={!!draft} onClose={() => setDraft(null)} title={draft?.id ? "Editar categoria" : "Nova categoria"} closeOnBack>
        {draft && (
          <>
            <Field label="Nome" error={errors.name}>
              {(id) => (
                <input
                  id={id}
                  className="field"
                  maxLength={60}
                  value={draft.name}
                  autoFocus
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  aria-invalid={!!errors.name}
                />
              )}
            </Field>
            {!draft.id && (
              <div>
                <span className="flabel">Tipo</span>
                <Seg
                  label="Tipo"
                  small
                  value={draft.transaction_type}
                  onChange={(v) => setDraft({ ...draft, transaction_type: v })}
                  options={[
                    ["EXPENSE", "Saída"],
                    ["INCOME", "Entrada"],
                  ]}
                />
              </div>
            )}
            <button type="button" className="cta" disabled={busy} onClick={save}>
              Salvar
            </button>
            {editingCat && (
              <button type="button" className={`btn-ghost ${editingCat.is_archived ? "" : "danger"}`} onClick={() => toggleArchive(editingCat)}>
                {editingCat.is_archived ? "Reativar categoria" : "Arquivar categoria"}
              </button>
            )}
            {editingCat && !editingCat.is_archived && <p className="cap">Arquivar não apaga lançamentos antigos; só impede o uso em novos.</p>}
          </>
        )}
      </Sheet>
    </Screen>
  );
}
