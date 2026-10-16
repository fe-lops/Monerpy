"use client";

import { Ghost } from "lucide-react";
import { useData } from "@/providers/DataProvider";

/** Faixa do modo visitante (/ghost-test-user): lembra que nada é salvo. */
export function GhostBanner() {
  const { repo, signOut } = useData();
  if (repo.mode !== "ghost") return null;
  return (
    <div role="note" className="sticky top-0 z-20 flex items-center justify-center gap-2 bg-accent px-4 py-1.5 text-center text-[13px] font-medium leading-5 text-on-accent">
      <Ghost size={16} className="flex-none" aria-hidden />
      <span>
        Modo visitante: explore à vontade — nada é salvo e atualizar a página restaura o exemplo.{" "}
        <button type="button" className="font-bold underline" onClick={() => signOut()}>
          Sair
        </button>
      </span>
    </div>
  );
}
