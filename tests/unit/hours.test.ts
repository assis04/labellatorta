/**
 * Horário de funcionamento: o selo "aberto agora" aparece em todas as páginas e
 * precisa estar certo para quem está em São Paulo, não importa o fuso do servidor
 * de build nem o do navegador do cliente.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { openingHours, TIMEZONE, type OpeningPeriod } from '../../src/data/business';
import { formatTime, getOpenStatus, hoursTable, schemaDayNames, zonedNow } from '../../src/lib/hours';

/** Instante fixo no horário de Brasília (UTC−3, sem horário de verão desde 2019). */
const sp = (isoLocal: string) => new Date(`${isoLocal}-03:00`);
const status = (isoLocal: string, hours: readonly OpeningPeriod[] = openingHours) =>
  getOpenStatus(sp(isoLocal), hours, TIMEZONE);

// Semana de referência: 09/11/2026 é segunda-feira.
const MON = '2026-11-09';
const TUE = '2026-11-10';
const FRI = '2026-11-13';
const SAT = '2026-11-14';
const SUN = '2026-11-15';

describe('datas de referência', () => {
  it('correspondem aos dias da semana esperados em São Paulo', () => {
    expect(zonedNow(sp(`${MON}T12:00:00`), TIMEZONE).day).toBe(1);
    expect(zonedNow(sp(`${TUE}T12:00:00`), TIMEZONE).day).toBe(2);
    expect(zonedNow(sp(`${FRI}T12:00:00`), TIMEZONE).day).toBe(5);
    expect(zonedNow(sp(`${SAT}T12:00:00`), TIMEZONE).day).toBe(6);
    expect(zonedNow(sp(`${SUN}T12:00:00`), TIMEZONE).day).toBe(0);
  });
});

describe('getOpenStatus', () => {
  it('está aberto no meio de um dia útil', () => {
    expect(status(`${TUE}T14:00:00`)).toEqual({ isOpen: true, label: 'Aberto agora · fecha às 21h' });
  });

  it('abre exatamente no horário de abertura', () => {
    expect(status(`${MON}T11:00:00`)).toEqual({ isOpen: true, label: 'Aberto agora · fecha às 21h' });
  });

  it('antes de abrir diz "abre hoje"', () => {
    expect(status(`${TUE}T09:30:00`)).toEqual({ isOpen: false, label: 'Fechado · abre hoje às 11h' });
    expect(status(`${MON}T10:59:00`)).toEqual({ isOpen: false, label: 'Fechado · abre hoje às 11h' });
  });

  it('exatamente no horário de fechar já está fechado', () => {
    expect(status(`${TUE}T21:00:00`).isOpen).toBe(false);
    expect(status(`${SAT}T16:00:00`).isOpen).toBe(false);
  });

  it('um minuto antes de fechar ainda está aberto', () => {
    expect(status(`${TUE}T20:59:00`)).toEqual({ isOpen: true, label: 'Aberto agora · fecha às 21h' });
    expect(status(`${SAT}T15:59:00`)).toEqual({ isOpen: true, label: 'Aberto agora · fecha às 16h' });
  });

  it('depois de fechar na sexta diz "abre amanhã" (sábado)', () => {
    expect(status(`${FRI}T21:30:00`)).toEqual({ isOpen: false, label: 'Fechado · abre amanhã às 11h' });
    expect(status(`${FRI}T21:00:00`)).toEqual({ isOpen: false, label: 'Fechado · abre amanhã às 11h' });
  });

  it('sábado depois das 16h o próximo dia aberto é segunda', () => {
    expect(status(`${SAT}T16:30:00`)).toEqual({ isOpen: false, label: 'Fechado · abre segunda às 11h' });
  });

  it('domingo diz "abre amanhã" (segunda)', () => {
    expect(status(`${SUN}T10:00:00`)).toEqual({ isOpen: false, label: 'Fechado · abre amanhã às 11h' });
    expect(status(`${SUN}T23:59:00`)).toEqual({ isOpen: false, label: 'Fechado · abre amanhã às 11h' });
  });

  it('usa o dia de São Paulo mesmo quando em UTC já é o dia seguinte', () => {
    // Sexta 22h em São Paulo = sábado 01h em UTC.
    const fridayNight = new Date('2026-11-14T01:00:00Z');
    expect(getOpenStatus(fridayNight, openingHours, TIMEZONE)).toEqual({
      isOpen: false,
      label: 'Fechado · abre amanhã às 11h',
    });
  });

  it('nomeia o dia da semana quando o próximo dia aberto não é amanhã', () => {
    const onlyWednesday: OpeningPeriod[] = [{ days: [3], opens: '08:30', closes: '12:00' }];
    expect(status(`${FRI}T10:00:00`, onlyWednesday)).toEqual({
      isOpen: false,
      label: 'Fechado · abre quarta às 8h30',
    });
  });

  it('sem nenhum horário cadastrado diz apenas "Fechado"', () => {
    expect(status(`${TUE}T14:00:00`, [])).toEqual({ isOpen: false, label: 'Fechado' });
  });
});

describe('formatTime', () => {
  it.each([
    ['21:00', '21h'],
    ['11:00', '11h'],
    ['11:30', '11h30'],
    ['09:00', '9h'],
    ['09:05', '9h05'],
    ['00:00', '0h'],
  ])('%s → %s', (input, expected) => {
    expect(formatTime(input)).toBe(expected);
  });
});

describe('hoursTable', () => {
  it('agrupa segunda a sexta, sábado e domingo fechado, nessa ordem', () => {
    expect(hoursTable(openingHours)).toEqual([
      { label: 'Segunda a sexta', value: '11h às 21h', days: [1, 2, 3, 4, 5] },
      { label: 'Sábado', value: '11h às 16h', days: [6] },
      { label: 'Domingo', value: 'Fechado', days: [0] },
    ]);
  });

  it('cobre os sete dias exatamente uma vez', () => {
    const days = hoursTable(openingHours).flatMap((row) => row.days);
    expect([...days].sort()).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('sem horários, mostra a semana inteira fechada numa linha só', () => {
    expect(hoursTable([])).toEqual([
      { label: 'Segunda a domingo', value: 'Fechado', days: [1, 2, 3, 4, 5, 6, 0] },
    ]);
  });
});

describe('schemaDayNames', () => {
  it('converte os dias para os nomes em inglês do schema.org', () => {
    expect(schemaDayNames([0, 1, 6])).toEqual(['Sunday', 'Monday', 'Saturday']);
  });
});

describe('zonedNow', () => {
  const originalTz = process.env['TZ'];
  afterEach(() => {
    if (originalTz === undefined) delete process.env['TZ'];
    else process.env['TZ'] = originalTz;
  });

  it('devolve dia e minutos no fuso pedido', () => {
    expect(zonedNow(sp(`${TUE}T14:35:00`), TIMEZONE)).toEqual({ day: 2, minutes: 14 * 60 + 35 });
  });

  it('meia-noite em São Paulo vira minuto 0', () => {
    expect(zonedNow(sp(`${SUN}T00:00:00`), TIMEZONE)).toEqual({ day: 0, minutes: 0 });
  });

  it.each(['UTC', 'Asia/Tokyo', 'America/Los_Angeles', 'Pacific/Kiritimati', 'America/Sao_Paulo'])(
    'não depende do fuso da máquina (TZ=%s)',
    (machineTz) => {
      process.env['TZ'] = machineTz;
      const instant = new Date('2026-11-14T01:00:00Z'); // sexta 22h em São Paulo
      expect(zonedNow(instant, TIMEZONE)).toEqual({ day: 5, minutes: 22 * 60 });
      expect(getOpenStatus(instant, openingHours, TIMEZONE).isOpen).toBe(false);
    },
  );

  it('respeita o fuso informado (o mesmo instante é outro dia em Tóquio)', () => {
    const instant = new Date('2026-11-14T01:00:00Z');
    expect(zonedNow(instant, 'Asia/Tokyo')).toEqual({ day: 6, minutes: 10 * 60 });
  });
});
