"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

/** Título da página com botão de voltar opcional e ações à direita. */
export function PageHeader({ title, back, right }: { title: string; back?: string | true; right?: React.ReactNode }) {
  const router = useRouter();
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-1">
        {back && (
          <button
            type="button"
            className="icon-btn -ml-2"
            aria-label="Voltar"
            onClick={() => (back === true ? router.back() : router.push(back))}
          >
            <ChevronLeft size={26} />
          </button>
        )}
        <h1 className="title truncate">{title}</h1>
      </div>
      {right}
    </div>
  );
}
