// Variáveis públicas do Supabase. O Next.js as embute no código DURANTE O BUILD,
// por isso cada referência precisa ser literal (process.env.NOME) e qualquer
// mudança na Vercel exige um novo deploy.

function clean(v: string | undefined): string {
  return (v ?? "").trim().replace(/^["']|["']$/g, "");
}

export const SUPABASE_URL = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);

/** Aceita o nome antigo (anon) e o novo (publishable), usado pela integração Supabase ↔ Vercel. */
export const SUPABASE_ANON_KEY = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) || clean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** Nomes das variáveis que faltaram neste build (para mostrar na tela de login). */
export const missingSupabaseEnv: string[] = [
  ...(SUPABASE_URL ? [] : ["NEXT_PUBLIC_SUPABASE_URL"]),
  ...(SUPABASE_ANON_KEY ? [] : ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]),
];
