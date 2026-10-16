// Contêiner de página: largura de celular, e no computador uma das três larguras padrão.

const SCREEN_WIDTH = {
  narrow: "lg:max-w-[640px]", // formulários e detalhes
  default: "lg:max-w-[960px]", // listas
  wide: "lg:max-w-[1200px]", // painéis em grade
};

/** Contêiner de tela: largura de celular; no computador, largura conforme o tipo de tela. */
export function Screen({ children, className = "", size = "default" }: { children: React.ReactNode; className?: string; size?: keyof typeof SCREEN_WIDTH }) {
  return (
    <main className={`mx-auto flex w-full max-w-[480px] flex-col gap-5 px-5 pb-12 pt-4 md:max-w-[640px] lg:gap-6 lg:px-10 lg:pb-16 lg:pt-8 ${SCREEN_WIDTH[size]} ${className}`}>
      {children}
    </main>
  );
}
