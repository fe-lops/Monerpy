// Dinheiro em centavos inteiros. Nunca usar float para somar valores.

const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** 12345 -> "R$ 123,45" (com espaço inseparável). */
export function brl(cents: number): string {
  return fmt.format(cents / 100).replace(/\s/g, " ");
}

export function brlSigned(cents: number, positive: boolean): string {
  return (positive ? "+" : "−") + " " + brl(cents);
}

/** Converte o texto digitado ("R$ 1.234,56", "1234,5", "12") em centavos. */
export function parseBRL(input: string): number {
  const clean = input.replace(/[^\d,.-]/g, "").trim();
  if (!clean) return 0;
  // Formato brasileiro: ponto como milhar, vírgula como decimal.
  const normalized = clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean;
  const n = Number(normalized);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

/** Máscara do campo de valor: só dígitos, interpretados como centavos. */
export function maskBRLInput(raw: string): { text: string; cents: number } {
  const digits = raw.replace(/\D/g, "").replace(/^0+/, "").slice(0, 13);
  const cents = digits ? parseInt(digits, 10) : 0;
  return { text: cents ? brl(cents) : "", cents };
}

/** Centavos -> string NUMERIC para o banco ("123.45"). */
export function centsToNumeric(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** NUMERIC do banco (string ou número) -> centavos. */
export function numericToCents(v: string | number | null | undefined): number {
  if (v === null || v === undefined || v === "") return 0;
  const s = String(v);
  const neg = s.startsWith("-");
  const [int, dec = ""] = s.replace("-", "").split(".");
  const cents = parseInt(int || "0", 10) * 100 + parseInt((dec + "00").slice(0, 2), 10);
  return neg ? -cents : cents;
}
