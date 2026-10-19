import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import { OverflowGuard } from "@/components/layout/OverflowGuard";
import { DataProvider } from "@/providers/DataProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], weight: ["600", "700", "800"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Monerpy",
  description: "Controle de caixa pessoal e profissional para microempreendedores.",
  applicationName: "Monerpy",
  // Ícone da aba: versão de acordo com o tema do navegador. Além destes, o Next inclui sozinho
  // src/app/favicon.ico (fallback) e src/app/apple-icon.png (iPhone).
  icons: {
    icon: [
      { url: "/brand/favicon-light.png", type: "image/png", sizes: "96x96", media: "(prefers-color-scheme: light)" },
      { url: "/brand/favicon-dark.png", type: "image/png", sizes: "96x96", media: "(prefers-color-scheme: dark)" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f172a",
};

// Aplica o tema salvo antes da pintura para não piscar.
const themeScript = `try{var t=localStorage.getItem('monerpy-tema');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}`;

// Autocorreção de versão desatualizada: se o navegador abrir um HTML de um deploy antigo
// (aba restaurada, cache do celular), os arquivos /_next/ daquela versão já não existem (404)
// e a página aparece sem estilo. Nesse caso recarrega UMA vez para baixar a versão atual.
// Duas detecções: erro de carregamento de <link>/<script> e, ao fim do load, CSS não aplicado
// (a variável --bg-app do tema não existe).
const staleAssetScript = `(function(){var K='monerpy:asset-reload';function heal(){try{if(sessionStorage.getItem(K))return;sessionStorage.setItem(K,'1')}catch(e){return}location.reload()}window.addEventListener('error',function(e){var t=e.target;if(t&&(t.tagName==='LINK'||t.tagName==='SCRIPT')&&/\\/_next\\//.test(t.href||t.src||''))heal()},true);window.addEventListener('load',function(){if(!getComputedStyle(document.documentElement).getPropertyValue('--bg-app').trim()){heal();return}try{sessionStorage.removeItem(K)}catch(e){}})})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${bricolage.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: staleAssetScript }} />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ToastProvider>
          <DataProvider>{children}</DataProvider>
          <OverflowGuard />
        </ToastProvider>
      </body>
    </html>
  );
}
