import type { Category, TxType } from "./types";

/**
 * Categoria coringa, existente para Entrada e para Saída. Vem pré-selecionada em todo lançamento novo.
 * O mesmo nome é usado na migration 20261018000000_outros_category.sql.
 */
export const OTHER_CATEGORY_NAME = "Outros";

/** A categoria "Outros" ativa do tipo, se existir. */
export function findOtherCategory(categories: Category[], type: TxType): Category | undefined {
  return categories.find((c) => c.transaction_type === type && !c.is_archived && c.name.trim().toLowerCase() === OTHER_CATEGORY_NAME.toLowerCase());
}

/** Categorias ativas do tipo para escolher: em ordem alfabética, com "Outros" por último. */
export function selectableCategories(categories: Category[], type: TxType, keepId?: string | null): Category[] {
  return categories
    .filter((c) => c.transaction_type === type && (!c.is_archived || c.id === keepId))
    .sort((a, b) => {
      const ao = a.name === OTHER_CATEGORY_NAME;
      const bo = b.name === OTHER_CATEGORY_NAME;
      if (ao !== bo) return ao ? 1 : -1;
      return a.name.localeCompare(b.name, "pt-BR");
    });
}
