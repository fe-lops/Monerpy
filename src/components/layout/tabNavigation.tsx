"use client";

// Navegação entre ABAS (barra inferior no celular, barra lateral no computador).
//
// Objetivo: o "voltar" a partir de uma aba sempre leva ao Início, em vez de refazer o caminho
// entre abas (Movimentações → Mais → voltar → Movimentações). Telas internas (detalhe de uma
// movimentação, Categorias aberta pelo Mais…) continuam com o "voltar" normal.
//
// Como: o histórico fica "… → Início → aba atual":
//  - Do Início para uma aba: empilha (push). De uma aba para outra: substitui (replace).
//  - A entrada do histórico aberta por uma aba recebe uma MARCA no history.state (o Next preserva
//    chaves extras por entrada). A marca diz se o Início está logo atrás (`homeBehind`).
//  - Aba "Início": se a entrada atual tem a marca com homeBehind, volta (history.back) — sem
//    empilhar outro Início; senão, substitui pelo Início.
//  - TabBackGuard: se o "voltar" sair de uma entrada marcada e não cair no Início, leva ao Início.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export const HOME = "/dashboard";

interface TabMark {
  path: string;
  /** O Início está imediatamente atrás desta entrada no histórico. */
  homeBehind: boolean;
}

const MARK_KEY = "__monerpyTab";
/** Marca a aplicar quando a navegação da aba terminar (a entrada nova só existe depois). */
let pendingMark: TabMark | null = null;

function currentMark(): TabMark | null {
  const m = window.history.state?.[MARK_KEY] as TabMark | undefined;
  return m && m.path === window.location.pathname ? m : null;
}

type TabLinkProps = Omit<React.ComponentProps<typeof Link>, "href" | "replace" | "onClick"> & { href: string };

/** Link de aba: aplica as regras de histórico descritas acima. */
export function TabLink({ href, ...props }: TabLinkProps) {
  const path = usePathname();
  const router = useRouter();

  function onClick(e: React.MouseEvent<HTMLAnchorElement>) {
    // Ctrl/Cmd/Shift/clique do meio: comportamento padrão (abrir em nova aba etc.).
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    if (href === path) return;

    const mark = currentMark();
    if (href === HOME) {
      if (mark?.homeBehind) window.history.back(); // o Início está logo atrás
      else router.replace(HOME);
      return;
    }

    if (path === HOME) {
      pendingMark = { path: href, homeBehind: true };
      router.push(href);
    } else {
      // Substitui a entrada atual: o Início continua atrás só se já estava atrás dela.
      pendingMark = { path: href, homeBehind: !!mark?.homeBehind };
      router.replace(href);
    }
  }

  return <Link href={href} onClick={onClick} {...props} />;
}

/** Aplica as marcas e leva ao Início quando o "voltar" sai de uma aba sem cair nele. */
export function TabBackGuard() {
  const path = usePathname();
  const router = useRouter();
  const current = useRef<{ path: string; isTab: boolean }>({ path, isTab: false });

  // A cada página: aplica a marca pendente (se for a página da aba) e lembra se esta entrada é de aba.
  useEffect(() => {
    if (pendingMark && pendingMark.path === path) {
      window.history.replaceState({ ...window.history.state, [MARK_KEY]: pendingMark }, "");
      pendingMark = null;
    }
    current.current = { path, isTab: !!currentMark() };
  }, [path]);

  useEffect(() => {
    const onPop = () => {
      const left = current.current; // a entrada de onde o "voltar" saiu
      const landed = window.location.pathname;
      if (landed === left.path) return; // mesma página: foi uma janela (Sheet) fechando com o "voltar"
      if (!left.isTab) return; // saiu de uma tela interna: "voltar" normal
      if (landed !== HOME) router.replace(HOME);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [router]);

  return null;
}
