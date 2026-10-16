"use client";

import { useEffect } from "react";
import { Spinner } from "@/components/ui";
import { enterGhostMode } from "@/lib/ghost";

/** Liga o modo visitante e recarrega no Início (o repositório é escolhido no carregamento). */
export function GhostEnter() {
  useEffect(() => {
    enterGhostMode();
    window.location.replace("/dashboard");
  }, []);
  return <Spinner />;
}
