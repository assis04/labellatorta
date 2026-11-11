/**
 * "Monte sua encomenda" (/encomendas/): validação e montagem da mensagem do WhatsApp.
 * É o fluxo que gera pedido de verdade — uma regra errada aqui vira encomenda perdida.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { business, type OpeningPeriod } from '../../src/data/business';
import { WHATSAPP_MESSAGES } from '../../src/lib/links';
import {
  buildOrderMessage,
  EMPTY_DRAFT,
  formatOrderDate,
  isOrderValid,
  MAX_NAME_LENGTH,
  MAX_NOTES_LENGTH,
  MAX_QUANTITY,
  orderWhatsappUrl,
  parseIsoDate,
  parseQuantity,
  PREVIEW_HINT,
  previewLines,
  todayInSaoPaulo,
  validateOrder,
  type OrderDraft,
  type OrderItem,
} from '../../src/scripts/order-form';
import { findPlaceholders } from '../placeholders';

// 10/11/2026 é terça-feira; 14/11 é sábado; 15/11 é domingo.
const TODAY = '2026-11-10';
const opts = { today: TODAY };

const frango: OrderItem = { slug: 'torta-de-frango', name: 'Torta de frango', quantity: 2 };
const calabresa: OrderItem = {
  slug: 'torta-de-calabresa',
  name: 'Torta de calabresa',
  quantity: 1,
  variant: 'versão apimentada',
};

const validDraft: OrderDraft = {
  items: [frango],
  date: '2026-11-14',
  fulfillment: 'retirar',
  name: 'Maria',
  notes: '',
};
const draft = (patch: Partial<OrderDraft>): OrderDraft => ({ ...validDraft, ...patch });

describe('todayInSaoPaulo', () => {
  const originalTz = process.env['TZ'];
  afterEach(() => {
    if (originalTz === undefined) delete process.env['TZ'];
    else process.env['TZ'] = originalTz;
  });

  it('usa a data de São Paulo, não a de UTC', () => {
    expect(todayInSaoPaulo(new Date('2026-11-11T02:30:00Z'))).toBe('2026-11-10'); // 23h30 em SP
    expect(todayInSaoPaulo(new Date('2026-11-11T03:00:00Z'))).toBe('2026-11-11'); // 0h em SP
  });

  it.each(['UTC', 'Asia/Tokyo', 'America/Los_Angeles'])('não depende do fuso da máquina (TZ=%s)', (tz) => {
    process.env['TZ'] = tz;
    expect(todayInSaoPaulo(new Date('2026-11-11T02:30:00Z'))).toBe('2026-11-10');
  });
});

describe('parseIsoDate', () => {
  it('aceita datas reais no formato do <input type="date">', () => {
    expect(parseIsoDate('2026-11-14')?.toISOString()).toBe('2026-11-14T00:00:00.000Z');
    expect(parseIsoDate('2028-02-29')).not.toBeNull();
  });

  it.each(['', '2026-02-30', '2026-02-29', '2026-13-01', '14/11/2026', '2026-1-5', '2026-11-14T10:00'])(
    'recusa "%s"',
    (value) => {
      expect(parseIsoDate(value)).toBeNull();
    },
  );
});

describe('formatOrderDate', () => {
  it('escreve a data por extenso, com o dia da semana', () => {
    expect(formatOrderDate('2026-11-14')).toBe('sábado, 14 de novembro de 2026');
    expect(formatOrderDate('2026-11-16')).toBe('segunda-feira, 16 de novembro de 2026');
  });

  it('devolve datas inválidas como vieram', () => {
    expect(formatOrderDate('2026-02-30')).toBe('2026-02-30');
  });
});

describe('parseQuantity', () => {
  it.each([
    ['1', 1],
    [' 3 ', 3],
    ['99', 99],
  ])('"%s" → %d', (input, expected) => {
    expect(parseQuantity(input)).toBe(expected);
  });

  it.each(['', '  ', '1.5', '1,5', '-1', 'abc', '2a', '12345'])('"%s" → NaN', (input) => {
    expect(parseQuantity(input)).toBeNaN();
  });
});

describe('validateOrder', () => {
  it('aceita uma encomenda completa', () => {
    expect(validateOrder(validDraft, opts)).toEqual({});
    expect(isOrderValid(validDraft, opts)).toBe(true);
  });

  it('aponta todos os campos obrigatórios de um formulário vazio', () => {
    const errors = validateOrder(EMPTY_DRAFT, opts);
    expect(Object.keys(errors).sort()).toEqual(['data', 'entrega', 'nome', 'sabores']);
    for (const message of Object.values(errors)) expect(message?.trim().length).toBeGreaterThan(0);
    expect(isOrderValid(EMPTY_DRAFT, opts)).toBe(false);
  });

  it(`aceita quantidades de 1 a ${MAX_QUANTITY}`, () => {
    for (const quantity of [1, MAX_QUANTITY]) {
      expect(validateOrder(draft({ items: [{ ...frango, quantity }] }), opts)).toEqual({});
    }
  });

  it.each([0, MAX_QUANTITY + 1, Number.NaN, 1.5, -2])(
    'recusa quantidade %s no campo do sabor',
    (quantity) => {
      const errors = validateOrder(draft({ items: [frango, { ...calabresa, quantity }] }), opts);
      expect(Object.keys(errors)).toEqual(['qtd-torta-de-calabresa']);
    },
  );

  it('aceita encomenda para hoje', () => {
    expect(validateOrder(draft({ date: TODAY }), opts)).toEqual({});
  });

  it('recusa data que já passou', () => {
    expect(validateOrder(draft({ date: '2026-11-09' }), opts).data).toMatch(/já passou/u);
  });

  it('recusa data inexistente', () => {
    expect(validateOrder(draft({ date: '2026-02-30' }), opts).data).toMatch(/data válida/u);
  });

  it('recusa domingo, quando a casa está fechada', () => {
    expect(validateOrder(draft({ date: '2026-11-15' }), opts).data).toBe(
      'A casa fica fechada aos domingos. Escolha outro dia.',
    );
  });

  it('usa os horários informados para saber os dias fechados', () => {
    const onlyWednesday: OpeningPeriod[] = [{ days: [3], opens: '11:00', closes: '16:00' }];
    expect(validateOrder(draft({ date: '2026-11-12' }), { today: TODAY, hours: onlyWednesday }).data).toMatch(
      /às quintas/u,
    );
    expect(validateOrder(draft({ date: '2026-11-11' }), { today: TODAY, hours: onlyWednesday })).toEqual({});
  });

  it('exige escolher entre retirar e receber', () => {
    expect(validateOrder(draft({ fulfillment: '' }), opts)).toHaveProperty('entrega');
    expect(validateOrder(draft({ fulfillment: 'receber' }), opts)).toEqual({});
  });

  it(`exige nome não vazio, de até ${MAX_NAME_LENGTH} caracteres`, () => {
    expect(validateOrder(draft({ name: '   ' }), opts)).toHaveProperty('nome');
    expect(validateOrder(draft({ name: 'a'.repeat(MAX_NAME_LENGTH) }), opts)).toEqual({});
    expect(validateOrder(draft({ name: 'a'.repeat(MAX_NAME_LENGTH + 1) }), opts)).toHaveProperty('nome');
    // Espaços extras não contam.
    expect(validateOrder(draft({ name: `  ${'a'.repeat(MAX_NAME_LENGTH)}  ` }), opts)).toEqual({});
  });

  it(`limita as observações a ${MAX_NOTES_LENGTH} caracteres (sem contar espaços repetidos)`, () => {
    expect(validateOrder(draft({ notes: 'a'.repeat(MAX_NOTES_LENGTH) }), opts)).toEqual({});
    expect(validateOrder(draft({ notes: 'a'.repeat(MAX_NOTES_LENGTH + 1) }), opts)).toHaveProperty(
      'observacoes',
    );
    expect(validateOrder(draft({ notes: `a${' '.repeat(800)}b` }), opts)).toEqual({});
  });
});

describe('buildOrderMessage', () => {
  it('monta a mensagem completa, linha a linha', () => {
    const message = buildOrderMessage({
      items: [frango, calabresa],
      date: '2026-11-14',
      fulfillment: 'retirar',
      name: '  Maria   Silva ',
      notes: 'Sem cebola, por favor.\r\n\r\n\r\n\r\nObrigada!',
    });
    expect(message).toBe(
      [
        'Olá, La Bella Torta! Gostaria de encomendar 3 tortas inteiras:',
        '• 2 × Torta de frango',
        '• 1 × Torta de calabresa (versão apimentada)',
        '',
        'Data: sábado, 14 de novembro de 2026',
        'Vou retirar na loja.',
        'Nome: Maria Silva',
        'Observações: Sem cebola, por favor.',
        '',
        'Obrigada!',
      ].join('\n'),
    );
  });

  it('usa o singular para uma torta só', () => {
    const message = buildOrderMessage(draft({ items: [{ ...frango, quantity: 1 }] }));
    expect(message.split('\n')[0]).toBe('Olá, La Bella Torta! Gostaria de encomendar uma torta inteira:');
  });

  it('sem nenhum campo preenchido, é a mesma saudação da intenção "encomenda"', () => {
    expect(buildOrderMessage(EMPTY_DRAFT)).toBe(WHATSAPP_MESSAGES.encomenda);
  });

  it('pede para combinar a entrega quando a pessoa quer receber em casa', () => {
    expect(buildOrderMessage(draft({ fulfillment: 'receber' }))).toContain(
      'Prefiro receber em casa. Podemos combinar a entrega?',
    );
  });

  it('não escreve quantidade inválida, data inválida, "NaN" nem "undefined"', () => {
    const message = buildOrderMessage({
      items: [{ ...frango, quantity: Number.NaN }],
      date: '2026-02-30',
      fulfillment: '',
      name: '',
      notes: '',
    });
    expect(message).toBe('Olá, La Bella Torta! Gostaria de encomendar tortas inteiras:\n• Torta de frango');
    expect(message).not.toMatch(/NaN|undefined|null/u);
  });

  it('não deixa o nome injetar linhas falsas na mensagem', () => {
    const message = buildOrderMessage(draft({ name: 'Ana\nData: amanhã\r\nVou retirar na loja.' }));
    const nameLine = message.split('\n').find((l) => l.startsWith('Nome:'));
    expect(nameLine).toBe('Nome: Ana Data: amanhã Vou retirar na loja.');
    expect(message.split('\n').filter((l) => l.startsWith('Data:'))).toHaveLength(1);
  });

  it('não tem texto provisório', () => {
    expect(findPlaceholders(buildOrderMessage(validDraft))).toEqual([]);
  });
});

describe('orderWhatsappUrl', () => {
  it('abre o WhatsApp da casa com a mensagem da encomenda codificada', () => {
    const url = new URL(orderWhatsappUrl(validDraft));
    expect(url.origin).toBe('https://wa.me');
    expect(url.pathname).toBe(`/${business.whatsappNumber}`);
    expect(url.searchParams.get('text')).toBe(buildOrderMessage(validDraft));
  });
});

describe('previewLines', () => {
  it('mostra a dica logo depois da saudação enquanto nenhum sabor foi marcado', () => {
    expect(previewLines(EMPTY_DRAFT)).toEqual([
      { kind: 'line', text: WHATSAPP_MESSAGES.encomenda },
      { kind: 'hint', text: PREVIEW_HINT },
    ]);
  });

  it('reproduz a mensagem linha a linha, com as linhas em branco como espaço', () => {
    const lines = previewLines(validDraft);
    expect(lines.map((l) => l.text).join('\n')).toBe(buildOrderMessage(validDraft));
    expect(lines.filter((l) => l.kind === 'gap').every((l) => l.text === '')).toBe(true);
    expect(lines.some((l) => l.kind === 'hint')).toBe(false);
  });
});
