/**
 * Resumos de texto derivados de `openingHours` para a home ("Seg a sáb, desde as 11h").
 * Puro e sem DOM: roda no build. Nenhum dia ou horário é escrito à mão nos componentes.
 */
import { openingHours, type OpeningPeriod, type Weekday } from '../../data/business';
import { formatTime } from '../../lib/hours';

const SHORT_NAMES = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const;
const LONG_NAMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'] as const;
const PLURAL_NAMES = LONG_NAMES.map((name) => `${name}s`);
/** Sábado e domingo são masculinos ("aos domingos"); os demais, femininos ("às segundas"). */
const MASCULINE: readonly Weekday[] = [0, 6];
/** Semana comercial: segunda primeiro, domingo por último. */
const WEEK_ORDER: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 0];

export interface WeekSummary {
  /** "seg a sáb" */
  daysShort: string;
  /** "segunda a sábado" */
  daysLong: string;
  /** Horário de abertura mais cedo da semana, ex.: "11h". */
  opensAt: string;
  /** "Fechado aos domingos" (ou "Aberto todos os dias"). */
  closedNote: string;
}

export function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase('pt-BR') + text.slice(1);
}

function toMinutes(hhmm: string): number {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** "segunda a sábado" quando são três ou mais dias seguidos; senão "segunda, quarta e sexta". */
function joinDays(days: readonly Weekday[], names: readonly string[]): string {
  const labels = days.map((d) => names[d] ?? '');
  const positions = days.map((d) => WEEK_ORDER.indexOf(d));
  const consecutive = positions.every((p, i) => i === 0 || p === (positions[i - 1] ?? -2) + 1);
  if (labels.length > 2 && consecutive) return `${labels[0]} a ${labels.at(-1)}`;
  if (labels.length <= 1) return labels[0] ?? '';
  return `${labels.slice(0, -1).join(', ')} e ${labels.at(-1)}`;
}

function closedNote(closed: readonly Weekday[]): string {
  if (closed.length === 0) return 'Aberto todos os dias';
  const list = joinDays(closed, PLURAL_NAMES);
  if (closed.every((d) => MASCULINE.includes(d))) return `Fechado aos ${list}`;
  if (closed.every((d) => !MASCULINE.includes(d))) return `Fechado às ${list}`;
  return `Fechado: ${list}`;
}

export function summarizeWeek(hours: readonly OpeningPeriod[] = openingHours): WeekSummary {
  const openDays = WEEK_ORDER.filter((d) => hours.some((p) => p.days.includes(d)));
  const earliest = hours.reduce<OpeningPeriod | undefined>(
    (min, p) => (!min || toMinutes(p.opens) < toMinutes(min.opens) ? p : min),
    undefined,
  );
  if (!earliest) throw new Error('openingHours está vazio');

  return {
    daysShort: joinDays(openDays, SHORT_NAMES),
    daysLong: joinDays(openDays, LONG_NAMES),
    opensAt: formatTime(earliest.opens),
    closedNote: closedNote(WEEK_ORDER.filter((d) => !openDays.includes(d))),
  };
}
