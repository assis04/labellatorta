/**
 * Horários em texto corrido ("segunda a sábado", "a partir das 11h"), derivados de `openingHours`.
 * Mudou o horário em src/data/business.ts, mudam o almoço, as encomendas e as dicas de data.
 */
import type { OpeningPeriod, Weekday } from '../../data/business';
import { formatTime } from '../../lib/hours';

const DAY_NAMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'] as const;
/** Semana como o brasileiro lê: de segunda a domingo. */
const WEEK: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 0];

/** Dias em que a casa abre, de segunda a domingo. */
export function openDays(hours: readonly OpeningPeriod[]): Weekday[] {
  return WEEK.filter((day) => hours.some((p) => p.days.includes(day)));
}

/** Dias em que a casa fica fechada, de segunda a domingo. */
export function closedDays(hours: readonly OpeningPeriod[]): Weekday[] {
  const open = new Set(openDays(hours));
  return WEEK.filter((day) => !open.has(day));
}

/** Junta itens em português: "a", "a e b", "a, b e c". */
export function joinPt(items: readonly string[], conjunction: 'e' | 'ou' = 'e'): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} ${conjunction} ${items.at(-1)}`;
}

/** "segunda a sábado" para dias seguidos; "segunda, quarta e sexta" para dias soltos. */
export function daysLabel(days: readonly Weekday[]): string {
  const ordered = WEEK.filter((d) => days.includes(d));
  const first = ordered[0];
  const last = ordered.at(-1);
  if (first === undefined || last === undefined) return '';
  if (ordered.length === 1) return DAY_NAMES[first];
  const contiguous = WEEK.indexOf(last) - WEEK.indexOf(first) === ordered.length - 1;
  return contiguous ? `${DAY_NAMES[first]} a ${DAY_NAMES[last]}` : joinPt(ordered.map((d) => DAY_NAMES[d]));
}

/** Horário de abertura mais cedo da semana, no formato da casa ("11h"). */
export function earliestOpening(hours: readonly OpeningPeriod[]): string {
  const opens = hours.map((p) => p.opens).sort();
  return opens[0] ? formatTime(opens[0]) : '';
}
