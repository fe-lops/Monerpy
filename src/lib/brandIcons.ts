/**
 * Endereços dos ícones do app (aba do navegador, iPhone, Android).
 *
 * Navegadores e atalhos instalados guardam o ícone pelo endereço e quase nunca o baixam de novo.
 * Por isso todo endereço leva `?v=ICON_VERSION`: ao trocar a arte (scripts/brand/gerar_marca.py),
 * aumente ICON_VERSION para que todos passem a buscar os arquivos novos.
 */
export const ICON_VERSION = "2";

export const brandIcon = (path: string) => `${path}?v=${ICON_VERSION}`;
