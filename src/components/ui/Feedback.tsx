// Estados de tela: lista vazia, título de seção e carregamento.

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="panel px-5 py-7 text-center text-sm text-ink-2">{children}</div>;
}

export function SectionTitle({ children, right, tone }: { children: React.ReactNode; right?: React.ReactNode; tone?: "late" }) {
  return (
    <h2 className={`-mb-2 flex items-baseline justify-between text-sm font-semibold ${tone === "late" ? "text-neg" : ""}`}>
      <span>{children}</span>
      {right && <small className="text-[13px] font-normal text-ink-2">{right}</small>}
    </h2>
  );
}

export function Spinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Carregando">
      <span className="size-8 animate-spin rounded-full border-[3px] border-line border-t-accent" />
    </div>
  );
}
