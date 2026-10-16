"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { BottomNav } from "@/components/layout";
import { Sidebar } from "@/components/layout";
import { useData } from "@/providers/DataProvider";
import { Screen, Spinner } from "@/components/ui";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { status, profile, error, reload, signOut } = useData();
  const router = useRouter();
  const path = usePathname();
  const onboarding = path === "/onboarding";

  // A introdução (saldo inicial) acontece UMA vez por conta: o estado fica em profiles.onboarded,
  // no banco, e vale para qualquer aparelho.
  const needsOnboarding = status === "ready" && !!profile && !profile.onboarded;
  const alreadyOnboarded = status === "ready" && !!profile && profile.onboarded;

  useEffect(() => {
    if (status === "anon") router.replace(onboarding ? "/login" : `/login?next=${encodeURIComponent(path)}`);
    if (needsOnboarding && !onboarding) router.replace("/onboarding");
    // Aba restaurada, atalho na tela inicial ou retorno do login podem abrir /onboarding de novo.
    if (alreadyOnboarded && onboarding) router.replace("/dashboard");
  }, [status, needsOnboarding, alreadyOnboarded, onboarding, path, router]);

  if (status === "error") {
    return (
      <Screen className="min-h-dvh justify-center text-center">
        <h1 className="title">Não foi possível carregar</h1>
        <p className="text-ink-2">{error}</p>
        <button className="cta" onClick={reload}>
          Tentar novamente
        </button>
        <button className="btn-ghost" onClick={signOut}>
          Sair
        </button>
      </Screen>
    );
  }
  // Enquanto redireciona, não mostra a tela errada (nem a introdução para quem já fez).
  if (status !== "ready" || !profile || (needsOnboarding && !onboarding) || (alreadyOnboarded && onboarding)) return <Spinner />;

  if (onboarding) return <>{children}</>;

  // Celular: barra inferior (oculta em telas de tarefa focada, como novo lançamento).
  // Computador (lg): barra lateral fixa sempre visível.
  const showBottomNav = !path.startsWith("/movimentacoes/nova");
  return (
    <div className={`lg:pl-64 ${showBottomNav ? "pb-[96px] lg:pb-0" : ""}`}>
      <Sidebar />
      {children}
      {showBottomNav && <BottomNav />}
    </div>
  );
}
