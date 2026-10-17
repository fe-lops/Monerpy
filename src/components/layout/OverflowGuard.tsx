"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Descreve um elemento para o aviso: tag + classes. */
function describe(el: Element): string {
  const cls = String((el as HTMLElement).className?.toString() ?? "").trim().split(/\s+/).slice(0, 6).join(".");
  return `<${el.tagName.toLowerCase()}${cls ? ` class="${cls}"` : ""}>`;
}

/**
 * Está dentro de algo que corta o conteúdo (ex.: `truncate`, rolagem)? Então não alarga a página.
 * html/body não contam: o `overflow-x: clip` deles é justamente a rede de segurança que esconde o problema.
 */
function clippedByAncestor(el: Element): boolean {
  for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
    if (getComputedStyle(p).overflowX !== "visible") return true;
  }
  return false;
}

/**
 * SÓ EM DESENVOLVIMENTO: avisa no console quando algum elemento passa da largura da tela.
 * Em produção o `overflow-x: clip` (globals.css) esconde o sintoma; este alarme mostra a causa
 * para corrigi-la (em geral: grade sem colunas definidas ou texto sem quebra em flex).
 */
export function OverflowGuard() {
  const path = usePathname();

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const check = () => {
      const width = document.documentElement.clientWidth;
      const culprits = [...document.querySelectorAll("body *")].filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.right <= width + 1) return false;
        const pos = getComputedStyle(el).position;
        if (pos === "fixed" || pos === "absolute") return false; // camadas sobrepostas não alargam a página
        return !clippedByAncestor(el);
      });
      // Mostra só os mais externos (o filho de um culpado também passa da tela).
      const outer = culprits.filter((el) => !culprits.includes(el.parentElement as Element));
      if (outer.length)
        console.warn(`[layout] ${outer.length} elemento(s) passam da largura da tela (${width}px) em ${path}:`, outer.slice(0, 5).map(describe), outer[0]);
    };
    const timer = setTimeout(check, 1500); // depois que os dados carregam
    window.addEventListener("resize", check);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", check);
    };
  }, [path]);

  return null;
}
