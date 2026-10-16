import "server-only";
import { NextResponse } from "next/server";
import { serverConfig } from "./config";
import { ApiError } from "./supabaseAdmin";

/** Executa o handler e converte erros em JSON `{ error }` com o status adequado. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("[api]", e);
    return NextResponse.json({ error: "Erro inesperado no servidor. Tente novamente." }, { status: 500 });
  }
}

/** URL pública do app para montar links de e-mail. */
export function appUrl(request: Request): string {
  return serverConfig.appUrl || new URL(request.url).origin;
}
