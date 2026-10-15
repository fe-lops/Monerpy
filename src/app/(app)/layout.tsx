"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { BottomNav } from "@/components/BottomNav";
import { useData } from "@/components/providers/DataProvider";
import { Screen, Spinner } from "@/components/ui";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { status, profile, error, reload, signOut } = useData();
  const router = useRouter();
  const path = usePathname();
  const onboarding = path === "/onboarding";

  useEffect(() => {
    if (status === "anon") router.replace(`/login?next=${encodeURIComponent(path)}`);
    if (status === "ready" && profile && !profile.onboarded && !onboarding) router.replace("/onboarding");
  }, [status, profile, onboarding, path, router]);

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
  if (status !== "ready" || !profile || (!profile.onboarded && !onboarding)) return <Spinner />;

  // Telas de tarefa focada (configuração inicial e novo lançamento) ficam sem a barra inferior.
  const showNav = !onboarding && !path.startsWith("/movimentacoes/nova");
  return (
    <div className={showNav ? "pb-[96px]" : ""}>
      {children}
      {showNav && <BottomNav />}
    </div>
  );
}
