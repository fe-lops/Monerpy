// Escala e rótulos compartilhados pelos gráficos (valores em centavos).

import type { CSSProperties } from "react";

/**
 * Colunas iguais que nunca passam da largura disponível. Com `flex`, rótulos longos sem quebra
 * (ex.: "Supermercado & Feira") somariam a largura mínima do gráfico e alargariam a página no celular.
 */
export function equalColumns(n: number): CSSProperties {
  return { display: "grid", gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` };
}

export function niceTop(max: number): { top: number; step: number } {
  const reais = max / 100;
  const raw = reais / 4;
  const pow = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1))));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? pow * 10;
  return { top: Math.max(step, Math.ceil(reais / step) * step) * 100, step: step * 100 };
}

export function short(cents: number): string {
  const r = cents / 100;
  if (r >= 1000) return `${(r / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return Math.round(r).toLocaleString("pt-BR");
}
