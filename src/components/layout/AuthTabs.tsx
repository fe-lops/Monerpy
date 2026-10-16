import Link from "next/link";

/** Alterna entre Entrar (/login) e Registrar (/registro) nas telas públicas. */
export function AuthTabs({ active }: { active: "login" | "registro" }) {
  const tab = (href: string, key: typeof active, label: string) => (
    <Link href={href} aria-current={active === key ? "page" : undefined} className="flex h-10 flex-1 items-center justify-center rounded-full font-medium text-ink-2 transition-colors aria-[current=page]:bg-[var(--seg-on)] aria-[current=page]:text-[var(--seg-on-text)] aria-[current=page]:shadow-[0_1px_3px_rgb(0_0_0/.25)]">
      {label}
    </Link>
  );
  return (
    <nav className="seg" aria-label="Acesso">
      {tab("/login", "login", "Entrar")}
      {tab("/registro", "registro", "Registrar")}
    </nav>
  );
}
