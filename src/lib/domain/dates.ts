import type { ISODate } from "./types";

export const DEFAULT_TZ = "America/Sao_Paulo";

/** Data de hoje (YYYY-MM-DD) no fuso informado. */
export function todayISO(tz: string = DEFAULT_TZ, now: Date = new Date()): ISODate {
  // en-CA formata como YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function parts(iso: ISODate): [number, number, number] {
  const [y, m, d] = iso.split("-").map(Number);
  return [y, m, d];
}

function toISO(y: number, m: number, d: number): ISODate {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Soma meses mantendo o dia, limitado ao último dia do mês (31/01 + 1 mês = 28/02). */
export function addMonths(iso: ISODate, n: number): ISODate {
  const [y, m, d] = parts(iso);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return toISO(ny, nm, Math.min(d, daysInMonth(ny, nm)));
}

/** O dia de `day` dentro do mês de `month`, limitado ao último dia (dia 31 em fevereiro = 28/29). */
export function sameDayInMonth(day: ISODate, month: ISODate): ISODate {
  const [y, m] = parts(month);
  return toISO(y, m, Math.min(parts(day)[2], daysInMonth(y, m)));
}

export function addDays(iso: ISODate, n: number): ISODate {
  const [y, m, d] = parts(iso);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return toISO(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

/** Diferença em dias (a - b). */
export function diffDays(a: ISODate, b: ISODate): number {
  const [ay, am, ad] = parts(a);
  const [by, bm, bd] = parts(b);
  return Math.round((Date.UTC(ay, am - 1, ad) - Date.UTC(by, bm - 1, bd)) / 864e5);
}

export function startOfMonth(iso: ISODate): ISODate {
  const [y, m] = parts(iso);
  return toISO(y, m, 1);
}

export function endOfMonth(iso: ISODate): ISODate {
  const [y, m] = parts(iso);
  return toISO(y, m, daysInMonth(y, m));
}

/** "15/10" */
export function dm(iso: ISODate): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

/** "15/10/2026" */
export function dmy(iso: ISODate): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

const WD = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function weekday(iso: ISODate): string {
  const [y, m, d] = parts(iso);
  return WD[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** "Outubro de 2026" */
export function monthLabel(iso: ISODate): string {
  const [y, m] = parts(iso);
  const name = MONTHS[m - 1];
  return `${name[0].toUpperCase()}${name.slice(1)} de ${y}`;
}

export function monthShort(iso: ISODate): string {
  return MONTHS_SHORT[parts(iso)[1] - 1];
}

/** Rótulo de agrupamento por dia: "Hoje · qua, 15/10". */
export function dayGroupLabel(iso: ISODate, today: ISODate): string {
  const base = `${weekday(iso)}, ${dm(iso)}`;
  const d = diffDays(today, iso);
  if (d === 0) return `Hoje · ${base}`;
  if (d === 1) return `Ontem · ${base}`;
  if (d === -1) return `Amanhã · ${base}`;
  return base;
}
