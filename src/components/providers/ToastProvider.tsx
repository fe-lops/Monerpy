"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

interface ToastAction {
  label: string;
  run: () => void;
}
interface ToastState {
  id: number;
  msg: string;
  action?: ToastAction;
  tone: "info" | "error";
}

type ToastFn = (msg: string, opts?: { action?: ToastAction; tone?: "info" | "error" }) => void;

const Ctx = createContext<ToastFn>(() => {});

export function useToast() {
  return useContext(Ctx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback<ToastFn>((msg, opts) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), msg, action: opts?.action, tone: opts?.tone ?? "info" });
    timer.current = setTimeout(() => setToast(null), 5500);
  }, []);

  return (
    <Ctx.Provider value={show}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[96px] z-50 mx-auto flex w-full max-w-[480px] justify-center px-5 lg:bottom-8 lg:left-64 lg:max-w-[440px]"
      >
        {toast && (
          <div
            key={toast.id}
            className="anim-up pointer-events-auto flex w-full items-center justify-between gap-3 rounded-[14px] px-4 py-3 text-sm font-medium shadow-[0_10px_30px_rgb(0_0_0/.35)]"
            style={{ background: toast.tone === "error" ? "var(--neg-chip)" : "var(--text)", color: toast.tone === "error" ? "#fff" : "var(--bg-app)" }}
          >
            <span>{toast.msg}</span>
            {toast.action && (
              <button
                type="button"
                className="p-1 font-bold underline"
                onClick={() => {
                  toast.action!.run();
                  setToast(null);
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </Ctx.Provider>
  );
}
