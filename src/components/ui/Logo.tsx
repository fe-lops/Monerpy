import Image from "next/image";
import logoOnDark from "@/assets/brand/logo-on-dark.webp";
import logoOnLight from "@/assets/brand/logo-on-light.webp";

/**
 * Logo da Monerpy (cédula com seta). Duas versões — sombra clara para o tema escuro e sombra escura
 * para o tema claro — trocadas só por CSS (.logo-on-dark / .logo-on-light em globals.css), sem piscar.
 * `height` em px; a largura acompanha a proporção da arte.
 * Arquivos gerados a partir dos SVGs originais (ver docs/ARQUITETURA.md → Marca).
 */
export function Logo({ height = 32, priority = false, className = "" }: { height?: number; priority?: boolean; className?: string }) {
  const width = Math.round((height * logoOnDark.width) / logoOnDark.height);
  return (
    <span className={`inline-flex flex-none ${className}`} style={{ width, height }} role="img" aria-label="Monerpy">
      <Image src={logoOnDark} alt="" width={width} height={height} priority={priority} className="logo-on-dark" />
      <Image src={logoOnLight} alt="" width={width} height={height} priority={priority} className="logo-on-light" />
    </span>
  );
}

/** Logo + nome "Monerpy" (cabeçalhos). */
export function Brand({ height = 32, priority = false, className = "" }: { height?: number; priority?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 font-display font-extrabold tracking-[-0.01em] ${className}`}>
      <Logo height={height} priority={priority} />
      <span style={{ fontSize: Math.round(height * 0.7), lineHeight: 1 }}>Monerpy</span>
    </span>
  );
}
