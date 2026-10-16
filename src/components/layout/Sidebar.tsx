"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChartColumn, Download, House, List, LogOut, Plus, Settings, Tags, UserCheck, Wallet } from "lucide-react";
import { useReminders } from "@/hooks";
import { useReady } from "@/providers/DataProvider";

const GROUPS = [
  {
    label: "Caixa",
    items: [
      { href: "/dashboard", label: "Início", icon: House, match: ["/dashboard"] },
      { href: "/movimentacoes", label: "Movimentações", icon: List, match: ["/movimentacoes"] },
      { href: "/pendencias", label: "Pendências", icon: Wallet, match: ["/pendencias", "/contas-a-pagar", "/contas-a-receber"] },
      { href: "/lembretes", label: "Lembretes", icon: Bell, match: ["/lembretes"] },
    ],
  },
  {
    label: "Análise e ajustes",
    items: [
      { href: "/relatorios", label: "Relatórios", icon: ChartColumn, match: ["/relatorios"] },
      { href: "/categorias", label: "Categorias", icon: Tags, match: ["/categorias"] },
      { href: "/exportar", label: "Exportar CSV", icon: Download, match: ["/exportar"] },
      { href: "/configuracoes", label: "Configurações", icon: Settings, match: ["/configuracoes", "/mais"] },
    ],
  },
];

/** Visível apenas para administradores (profiles.is_admin). */
const ADMIN_GROUP = {
  label: "Administração",
  items: [{ href: "/admin/registros", label: "Registros", icon: UserCheck, match: ["/admin"] }],
};

/** Navegação lateral do computador (substitui a barra inferior a partir de 1024 px). */
export function Sidebar() {
  const path = usePathname();
  const router = useRouter();
  const { profile, session, repo, signOut } = useReady();
  const { unseen } = useReminders();
  const isActive = (m: string[]) => m.some((p) => path === p || (path.startsWith(p + "/") && !path.startsWith("/movimentacoes/nova")));
  const initials =
    (profile.display_name || "Monerpy")
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "M";

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col gap-6 border-r border-line bg-[var(--bg-nav)] px-4 py-6 lg:flex" aria-label="Navegação principal">
      <Link href="/dashboard" className="flex items-center gap-2 px-2 font-display text-[22px] font-extrabold leading-7 tracking-[-0.01em]">
        <i className="inline-block size-2.5 rounded-full bg-accent" />
        Monerpy
      </Link>

      <Link href="/movimentacoes/nova?tipo=saida" className="cta h-12 text-base" aria-current={path.startsWith("/movimentacoes/nova") ? "page" : undefined}>
        <Plus size={20} strokeWidth={2.4} aria-hidden /> Novo lançamento
      </Link>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto">
        {(profile.is_admin ? [...GROUPS, ADMIN_GROUP] : GROUPS).map((g) => (
          <div key={g.label} className="flex flex-col gap-1">
            <span className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[.08em] text-ink-2">{g.label}</span>
            {g.items.map(({ href, label, icon: Icon, match }) => {
              const on = isActive(match);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={on ? "page" : undefined}
                  className={`flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors ${
                    on ? "bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-accent-ink" : "text-ink-2 hover:bg-[color-mix(in_srgb,var(--text)_6%,transparent)] hover:text-ink"
                  }`}
                >
                  <Icon size={20} strokeWidth={1.9} aria-hidden />
                  <span className="flex-1">{label}</span>
                  {href === "/lembretes" && unseen > 0 && <span className="badge badge-neg">{unseen}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-3 border-t border-line px-1 pt-4">
        <div className="grid size-10 flex-none place-items-center rounded-full bg-accent font-display text-sm font-extrabold text-on-accent">{initials}</div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold">{profile.display_name || "Minha conta"}</span>
          <span className="truncate text-xs text-ink-2">{repo.mode === "local" ? "Modo local" : session?.email}</span>
        </div>
        <button
          type="button"
          className="icon-btn"
          aria-label="Sair"
          title="Sair"
          onClick={async () => {
            await signOut();
            router.replace("/login");
          }}
        >
          <LogOut size={20} />
        </button>
      </div>
    </aside>
  );
}
