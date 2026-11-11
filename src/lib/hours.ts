/**
 * Lógica de horário de funcionamento — pura e sem dependência de DOM,
 * usada no build (texto padrão) e no navegador (status "aberto agora" em tempo real).
 */
import type { OpeningPeriod, Weekday } from '../data/business';

export interface OpenStatus {
  isOpen: boolean;
  /** Texto curto pronto para exibir, ex.: "Aberto agora · fecha às 21h". */
  label: string;
}

const WEEKDAY_NAMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'] as const;
const WEEKDAY_INDEX: Record<string, Weekday> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  if (h === undefined || m === undefined || Number.isNaN(h) || Number.isNaN(m)) {
    throw new Error(`Horário inválido: ${hhmm}`);
  }
  return h * 60 + m;
}

/** "21:00" → "21h", "11:30" → "11h30" */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':');
  return m === '00' ? `${Number(h)}h` : `${Number(h)}h${m}`;
}

/** Dia da semana e minutos desde a meia-noite no fuso informado. */
export function zonedNow(date: Date, timeZone: string): { day: Weekday; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  const day = WEEKDAY_INDEX[get('weekday')];
  if (day === undefined) throw new Error('Não foi possível determinar o dia da semana');
  return { day, minutes: (Number(get('hour')) % 24) * 60 + Number(get('minute')) };
}

function periodFor(hours: readonly OpeningPeriod[], day: Weekday): OpeningPeriod | undefined {
  return hours.find((p) => p.days.includes(day));
}

export function getOpenStatus(date: Date, hours: readonly OpeningPeriod[], timeZone: string): OpenStatus {
  const { day, minutes } = zonedNow(date, timeZone);
  const today = periodFor(hours, day);

  if (today && minutes >= toMinutes(today.opens) && minutes < toMinutes(today.closes)) {
    return { isOpen: true, label: `Aberto agora · fecha às ${formatTime(today.closes)}` };
  }
  if (today && minutes < toMinutes(today.opens)) {
    return { isOpen: false, label: `Fechado · abre hoje às ${formatTime(today.opens)}` };
  }
  for (let offset = 1; offset <= 7; offset++) {
    const next = ((day + offset) % 7) as Weekday;
    const period = periodFor(hours, next);
    if (period) {
      const when = offset === 1 ? 'amanhã' : WEEKDAY_NAMES[next];
      return { isOpen: false, label: `Fechado · abre ${when} às ${formatTime(period.opens)}` };
    }
  }
  return { isOpen: false, label: 'Fechado' };
}

export interface HoursRow {
  /** Ex.: "Segunda a sexta", "Sábado", "Domingo" */
  label: string;
  /** Ex.: "11h às 21h" ou "Fechado" */
  value: string;
  days: readonly Weekday[];
}

const DAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'] as const;

/** Linhas da tabela de horários, de segunda a domingo, agrupando dias consecutivos iguais. */
export function hoursTable(hours: readonly OpeningPeriod[]): HoursRow[] {
  const order: Weekday[] = [1, 2, 3, 4, 5, 6, 0];
  const rows: HoursRow[] = [];
  for (const day of order) {
    const p = periodFor(hours, day);
    const value = p ? `${formatTime(p.opens)} às ${formatTime(p.closes)}` : 'Fechado';
    const last = rows.at(-1);
    if (last && last.value === value) {
      last.days = [...last.days, day];
    } else {
      rows.push({ label: '', value, days: [day] });
    }
  }
  for (const row of rows) {
    const first = row.days[0] as Weekday;
    const last = row.days.at(-1) as Weekday;
    row.label =
      row.days.length === 1 ? DAY_LABELS[first] : `${DAY_LABELS[first]} a ${DAY_LABELS[last].toLowerCase()}`;
  }
  return rows;
}

/** Formato schema.org: "Mo-Fr 11:00-21:00" (usado no llms.txt e como referência). */
const SCHEMA_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export function schemaDayNames(days: readonly Weekday[]): string[] {
  return days.map((d) => SCHEMA_DAYS[d]);
}
