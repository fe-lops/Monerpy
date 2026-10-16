// Variáveis públicas do Supabase. O Next.js as embute no código DURANTE O BUILD,
// por isso cada referência precisa ser literal (process.env.NOME) e qualquer
// mudança na Vercel exige um novo deploy.

function clean(v: string | undefined): string {
  return (v ?? "").trim().replace(/^["']|["']$/g, "").trim();
}

function looksLikeKey(v: string): boolean {
  return v.startsWith("eyJ") || v.startsWith("sb_publishable_") || v.startsWith("sb_secret_");
}

/**
 * Normaliza a URL do projeto. Aceita os erros de cópia mais comuns:
 * sem "https://", só o ID do projeto, ou com caminho no final ("/rest/v1").
 * Retorna "" quando não dá para obter uma URL http(s) válida.
 */
export function normalizeSupabaseUrl(raw: string): string {
  let v = clean(raw);
  if (!v || looksLikeKey(v)) return "";
  if (/^[a-z0-9]{20}$/.test(v)) v = `${v}.supabase.co`; // só o ID do projeto
  if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
  try {
    const u = new URL(v);
    if (u.protocol !== "https:" && u.protocol !== "http:") return "";
    if (!u.hostname.includes(".") && u.hostname !== "localhost") return "";
    return u.origin; // descarta caminhos como /rest/v1 e a barra final
  } catch {
    return "";
  }
}

/** Chave secreta: "sb_secret_…" ou JWT antigo com role "service_role". Nunca deve ir para o navegador. */
function isSecretKey(v: string): boolean {
  if (v.startsWith("sb_secret_")) return true;
  if (!v.startsWith("eyJ")) return false;
  try {
    const payload = JSON.parse(atob(v.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload?.role === "service_role";
  } catch {
    return false;
  }
}

const RAW_URL = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
/** Aceita o nome antigo (anon) e o novo (publishable), usado pela integração Supabase ↔ Vercel. */
const RAW_KEY = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) || clean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

export const SUPABASE_URL = normalizeSupabaseUrl(RAW_URL);
export const SUPABASE_ANON_KEY = RAW_KEY && !isSecretKey(RAW_KEY) && !RAW_KEY.startsWith("http") ? RAW_KEY : "";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** Problemas encontrados nas variáveis deste build (exibidos na tela de login). */
export const supabaseEnvProblems: string[] = (() => {
  const out: string[] = [];
  if (!RAW_URL) out.push("NEXT_PUBLIC_SUPABASE_URL não foi definida.");
  else if (looksLikeKey(RAW_URL)) out.push("NEXT_PUBLIC_SUPABASE_URL contém uma chave, não a URL. Parece que URL e chave foram trocadas.");
  else if (!SUPABASE_URL) out.push("NEXT_PUBLIC_SUPABASE_URL não é uma URL válida. Use o formato https://SEU-PROJETO.supabase.co");

  if (!RAW_KEY) out.push("NEXT_PUBLIC_SUPABASE_ANON_KEY (ou ..._PUBLISHABLE_KEY) não foi definida.");
  else if (RAW_KEY.startsWith("http")) out.push("NEXT_PUBLIC_SUPABASE_ANON_KEY contém uma URL, não a chave. Parece que URL e chave foram trocadas.");
  else if (isSecretKey(RAW_KEY))
    out.push("A chave informada é a SECRETA (service_role / sb_secret_). Troque pela chave pública (anon ou publishable) e gere uma nova chave secreta no Supabase.");
  return out;
})();
