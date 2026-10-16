"use client";

import Link from "next/link";
import { Bell, ChartColumn, ChevronRight, Download, Settings, Tags } from "lucide-react";
import { useReminders } from "@/hooks";
import { useReady } from "@/providers/DataProvider";
import { PageHeader, Screen } from "@/components/ui";

const ITEMS = [
  { href: "/lembretes", icon: Bell, name: "Lembretes", sub: "Vencimentos próximos e atrasados" },
  { href: "/relatorios", icon: ChartColumn, name: "Relatórios", sub: "Entradas x saídas, categorias e previsão" },
  { href: "/categorias", icon: Tags, name: "Categorias", sub: "Criar, editar e arquivar" },
  { href: "/exportar", icon: Download, name: "Exportar CSV", sub: "Planilha das movimentações" },
  { href: "/configuracoes", icon: Settings, name: "Configurações", sub: "Perfil, saldo inicial, tema e segurança" },
];

export default function MaisPage() {
  const { profile, session, repo } = useReady();
  const { unseen } = useReminders();
  const initials =
    (profile.display_name || "Monerpy")
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "M";

  return (
    <Screen>
      <PageHeader title="Mais" />
      <div className="panel flex items-center gap-3.5 p-4">
        <div className="grid size-[52px] flex-none place-items-center rounded-full bg-accent font-display text-lg font-extrabold text-on-accent">{initials}</div>
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-display text-lg font-bold">{profile.display_name || "Minha conta"}</span>
          <span className="row-sub truncate">{repo.mode === "local" ? "Modo local · dados neste navegador" : session?.email}</span>
        </div>
      </div>
      <ul className="list panel">
        {ITEMS.map(({ href, icon: Icon, name, sub }) => (
          <li key={href}>
            <Link href={href} className="flex min-h-14 items-center justify-between gap-3 px-4 py-3.5 hover:bg-[color-mix(in_srgb,var(--text)_5%,transparent)]">
              <span className="flex min-w-0 items-center gap-3">
                <Icon size={22} className="flex-none text-ink-2" aria-hidden />
                <span className="flex min-w-0 flex-col">
                  <span className="row-name">{name}</span>
                  <span className="row-sub">{sub}</span>
                </span>
              </span>
              <span className="flex items-center gap-2">
                {href === "/lembretes" && unseen > 0 && <span className="badge badge-neg">{unseen}</span>}
                <ChevronRight size={18} className="text-ink-2" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-center text-xs text-ink-2">Monerpy v{process.env.NEXT_PUBLIC_APP_VERSION}</p>
    </Screen>
  );
}
