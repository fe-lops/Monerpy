"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ellipsis, House, List, Plus, Wallet } from "lucide-react";
import { TabLink } from "./tabNavigation";

const ITEMS = [
  { href: "/dashboard", label: "Início", icon: House, match: ["/dashboard"] },
  { href: "/movimentacoes", label: "Movimentações", icon: List, match: ["/movimentacoes"] },
  { href: "/pendencias", label: "Pendências", icon: Wallet, match: ["/pendencias", "/contas-a-pagar", "/contas-a-receber"] },
  { href: "/mais", label: "Mais", icon: Ellipsis, match: ["/mais", "/lembretes", "/relatorios", "/categorias", "/exportar", "/configuracoes", "/admin"] },
];

export function BottomNav() {
  const path = usePathname();
  const active = (m: string[]) => m.some((p) => path === p || (path.startsWith(p + "/") && !path.startsWith("/movimentacoes/nova")));
  const item = (i: (typeof ITEMS)[number]) => {
    const Icon = i.icon;
    const on = active(i.match);
    return (
      <TabLink
        key={i.href}
        href={i.href}
        aria-current={on ? "page" : undefined}
        className={`flex min-w-0 flex-col items-center gap-1 text-[11px] font-medium leading-[14px] ${on ? "text-accent-ink" : "text-ink-2"}`}
      >
        <Icon size={24} strokeWidth={1.9} aria-hidden />
        <span className="whitespace-nowrap">{i.label}</span>
      </TabLink>
    );
  };
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t lg:hidden border-line bg-[var(--bg-nav)] px-1 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2.5"
    >
      <div className="mx-auto grid max-w-[480px] grid-cols-5">
        {item(ITEMS[0])}
        {item(ITEMS[1])}
        <Link href="/movimentacoes/nova?tipo=saida" aria-label="Novo lançamento" className="group flex flex-col items-center gap-1 text-[11px] font-medium leading-[14px] text-ink-2">
          <span className="-mb-1.5 -mt-8 grid size-[60px] place-items-center rounded-full bg-accent text-on-accent shadow-[0_0_0_5px_var(--bg-app),0_8px_18px_rgb(0_0_0/.3)] transition-transform group-hover:scale-105">
            <Plus size={28} strokeWidth={2.3} aria-hidden />
          </span>
          <span>Lançar</span>
        </Link>
        {item(ITEMS[2])}
        {item(ITEMS[3])}
      </div>
    </nav>
  );
}
