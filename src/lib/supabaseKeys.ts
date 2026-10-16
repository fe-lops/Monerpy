// Análise das chaves do Supabase SEM chamar a rede. Funções puras (ver supabaseKeys.test.ts).
//
// Formatos:
//  - Novos:  "sb_publishable_…" (pública) e "sb_secret_…" (secreta).
//  - Antigos (legacy): JWT "eyJ…". O conteúdo traz `role` ("anon" ou "service_role")
//    e `ref` (ID do projeto), o que permite detectar chave trocada ou de outro projeto.

interface JwtPayload {
  role?: string;
  ref?: string;
}

function decodeJwtPayload(key: string): JwtPayload | null {
  if (!key.startsWith("eyJ")) return null;
  try {
    const part = key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(part.padEnd(Math.ceil(part.length / 4) * 4, "=")));
  } catch {
    return null;
  }
}

/** Chave secreta (service_role / sb_secret_). Nunca deve ir para o navegador. */
export function isSecretKey(key: string): boolean {
  return key.startsWith("sb_secret_") || decodeJwtPayload(key)?.role === "service_role";
}

/** ID do projeto a partir da URL (https://<ref>.supabase.co). */
export function projectRefFromUrl(url: string): string | null {
  const m = /^https?:\/\/([a-z0-9]+)\.supabase\.(co|in)/i.exec(url);
  return m ? m[1].toLowerCase() : null;
}

/**
 * Explica o que há de errado com a SUPABASE_SERVICE_ROLE_KEY, ou null se o formato parece correto.
 * (Uma chave com formato certo ainda pode ser recusada, ex.: revogada ou legacy desativada.)
 */
export function serviceKeyProblem(key: string, supabaseUrl: string): string | null {
  if (!key) return "SUPABASE_SERVICE_ROLE_KEY não está configurada no servidor.";
  if (key.startsWith("sb_publishable_") || decodeJwtPayload(key)?.role === "anon")
    return "SUPABASE_SERVICE_ROLE_KEY contém a chave PÚBLICA (anon/publishable). Use a chave service_role (ou uma Secret key sb_secret_…).";
  if (key.startsWith("sb_secret_")) return null;

  const payload = decodeJwtPayload(key);
  if (!payload) return "SUPABASE_SERVICE_ROLE_KEY não parece uma chave do Supabase (esperado “sb_secret_…” ou “eyJ…”). Confira se foi copiada inteira.";
  if (payload.role !== "service_role") return `SUPABASE_SERVICE_ROLE_KEY tem papel “${payload.role ?? "desconhecido"}”; é preciso a chave service_role.`;

  const ref = projectRefFromUrl(supabaseUrl);
  if (ref && payload.ref && payload.ref !== ref)
    return `SUPABASE_SERVICE_ROLE_KEY é de outro projeto (${payload.ref}); a URL configurada é do projeto ${ref}.`;
  return null;
}

/** Erros do Supabase que indicam chave recusada (e não sessão da usuária). */
export function isKeyRejection(message: string): boolean {
  return /invalid api key|legacy api keys? (are|is) disabled|no api key|unregistered api key|invalid jwt|jwsinvalidsignature|apikey/i.test(message);
}
