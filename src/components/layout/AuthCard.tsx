export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col justify-center gap-8 px-5 py-10">
      <div className="flex items-center gap-2 font-display text-[22px] font-extrabold leading-7 tracking-[-0.01em]">
        <i className="inline-block size-2.5 rounded-full bg-accent" />
        Monerpy
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="title">{title}</h1>
        {subtitle && <p className="text-ink-2">{subtitle}</p>}
      </div>
      {children}
    </main>
  );
}
