import type { MetadataRoute } from "next";

/**
 * Manifesto do app (atalho "Adicionar à tela inicial" no celular).
 * start_url fixo no Início: o atalho nunca reabre telas de uso único, como a introdução.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Monerpy",
    short_name: "Monerpy",
    description: "Controle de caixa pessoal e profissional para microempreendedores.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    lang: "pt-BR",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
