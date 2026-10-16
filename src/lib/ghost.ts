// Usuário fantasma (/ghost-test-user): visitante que explora o app com dados de exemplo.
// Tudo roda na memória do navegador; nada vai para o Supabase e recarregar a página zera os dados.
// O cookie de sessão (sem validade) marca o modo visitante até a aba/navegador fechar ou "Sair".

export const GHOST_COOKIE = "monerpy_ghost";

export function isGhostBrowser(): boolean {
  return typeof document !== "undefined" && document.cookie.split("; ").includes(`${GHOST_COOKIE}=1`);
}

export function enterGhostMode(): void {
  document.cookie = `${GHOST_COOKIE}=1; path=/; SameSite=Lax`;
}

export function leaveGhostMode(): void {
  document.cookie = `${GHOST_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}
