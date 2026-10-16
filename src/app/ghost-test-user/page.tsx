import type { Metadata } from "next";
import { GhostEnter } from "./GhostEnter";

// Link de demonstração: fora dos buscadores.
export const metadata: Metadata = { title: "Monerpy — visitante", robots: { index: false, follow: false } };

/** /ghost-test-user — entra no modo visitante (dados de exemplo em memória; nada é salvo). */
export default function GhostTestUserPage() {
  return <GhostEnter />;
}
