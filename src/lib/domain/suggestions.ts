// Sugestões de descrição no "Novo lançamento": ao digitar, o app oferece lançamentos anteriores
// com nome parecido para repetir os mesmos atributos (valor, categoria, forma, contexto…).

import { normalize } from "./finance";
import type { InstallmentGroup, Transaction, TxType } from "./types";

export interface DescriptionSuggestion {
  /** Descrição normalizada: uma sugestão por nome. */
  key: string;
  /** Descrição sem o sufixo de parcela, ex.: "Notebook (3/10)" → "Notebook". */
  description: string;
  /** Lançamento mais recente com esse nome (fonte dos atributos). */
  tx: Transaction;
  /** Grupo de cobranças no crédito do lançamento, se houver (parcelado/repetido ou fixa mensal). */
  group: InstallmentGroup | null;
}

/** Digitar pelo menos isto antes de sugerir. */
export const MIN_SUGGEST_CHARS = 2;

export function stripInstallmentSuffix(description: string): string {
  return description.replace(/\s*\(\d+\/\d+\)\s*$/, "").trim();
}

/**
 * Lançamentos anteriores do mesmo tipo cujo nome começa com o texto digitado (ou tem uma palavra,
 * no meio, que começa com ele). Ignora acentos e maiúsculas e os cancelados. Um item por nome, o mais
 * recente; os que começam com o texto vêm primeiro, depois os mais recentes.
 */
export function descriptionSuggestions(
  txs: Transaction[],
  groups: InstallmentGroup[],
  query: string,
  type: TxType,
  limit = 5,
): DescriptionSuggestion[] {
  const q = normalize(query.trim());
  if (q.length < MIN_SUGGEST_CHARS) return [];

  const newer = (a: Transaction, b: Transaction) =>
    a.transaction_date !== b.transaction_date ? a.transaction_date > b.transaction_date : a.created_at > b.created_at;

  const latest = new Map<string, { description: string; tx: Transaction; prefix: boolean }>();
  for (const tx of txs) {
    if (tx.type !== type || tx.status === "CANCELLED") continue;
    const description = stripInstallmentSuffix(tx.description);
    const key = normalize(description);
    const prefix = key.startsWith(q);
    if (!prefix && !key.includes(` ${q}`)) continue;
    const cur = latest.get(key);
    if (!cur || newer(tx, cur.tx)) latest.set(key, { description, tx, prefix });
  }

  return [...latest.entries()]
    .sort(([, a], [, b]) => (a.prefix !== b.prefix ? (a.prefix ? -1 : 1) : newer(a.tx, b.tx) ? -1 : 1))
    .slice(0, limit)
    .map(([key, { description, tx }]) => ({
      key,
      description,
      tx,
      group: (tx.installment_group_id && groups.find((g) => g.id === tx.installment_group_id)) || null,
    }));
}
