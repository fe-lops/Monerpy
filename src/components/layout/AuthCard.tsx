import { Brand } from "@/components/ui/Logo";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col justify-center gap-8 px-5 py-10">
      <Brand height={44} priority />
      <div className="flex flex-col gap-2">
        <h1 className="title">{title}</h1>
        {subtitle && <p className="text-ink-2">{subtitle}</p>}
      </div>
      {children}
    </main>
  );
}
