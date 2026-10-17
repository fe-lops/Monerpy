"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /**
   * O botão/gesto "voltar" do celular fecha a folha em vez de sair da página.
   * Use só em folhas que fecham sem navegar em seguida (a entrada extra no histórico
   * é removida ao fechar; uma navegação logo depois disputaria com essa remoção).
   */
  closeOnBack?: boolean;
  /** Janela menor (até 70% da altura): a tela de trás continua visível, escurecida. */
  compact?: boolean;
}

/** Folha inferior modal (padrão do Design System para formulários rápidos). */
export function Sheet({ open, onClose, title, children, closeOnBack = false, compact = false }: SheetProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Guarda o onClose mais recente sem reexecutar o efeito abaixo. As telas passam
  // `onClose={() => …}` (função nova a cada render); se o efeito dependesse dela,
  // rodaria a cada tecla digitada e roubaria o foco do campo de texto.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Roda só quando a folha abre/fecha.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Foca a folha para leitores de tela, sem tirar o foco de um campo com autoFocus.
    if (!ref.current?.contains(document.activeElement)) ref.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Botão "voltar": empilha uma entrada no histórico ao abrir; o "voltar" a consome e fecha a folha.
  // Se a folha fechar de outro jeito (X, Esc, fundo, ação), remove a entrada que empilhou.
  useEffect(() => {
    if (!open || !closeOnBack) return;
    const marker = Math.random().toString(36).slice(2);
    window.history.pushState({ ...window.history.state, __monerpySheet: marker }, "");
    const onPop = () => onCloseRef.current();
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (window.history.state?.__monerpySheet === marker) window.history.back();
    };
  }, [open, closeOnBack]);

  if (!open) return null;
  return (
    // Celular: folha que sobe da base. Computador: modal centralizado.
    <div className="fixed inset-0 z-40 flex items-end justify-center lg:items-center lg:p-6">
      <div className="anim-fade absolute inset-0" style={{ background: "var(--scrim)" }} onClick={onClose} />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`anim-sheet relative flex ${compact ? "max-h-[70dvh]" : "max-h-[92dvh]"} w-full max-w-[480px] flex-col gap-4 overflow-y-auto rounded-t-3xl border-t border-line bg-card px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-5 outline-none md:max-w-[560px] ${compact ? "lg:max-h-[70dvh]" : "lg:max-h-[85dvh]"} lg:rounded-3xl lg:border lg:px-7 lg:pb-7 lg:pt-6 lg:shadow-[0_30px_80px_rgb(0_0_0/.45)]`}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-bold">{title}</h2>
          <button type="button" className="icon-btn" aria-label="Fechar" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
