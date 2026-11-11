/**
 * "Monte sua encomenda" (/encomendas/).
 *
 * Nada sai do aparelho da pessoa: a mensagem é montada aqui, no navegador, e o botão abre o
 * WhatsApp (wa.me) numa nova aba com o texto pronto — ela confere e envia por lá.
 *
 * As funções puras (data de hoje em São Paulo, validação, montagem da mensagem e da prévia)
 * não tocam no DOM e são exportadas para os testes e para o HTML gerado no build.
 * `initOrderForm` é a única parte que liga eventos; importar este módulo não executa nada.
 */
import { business, openingHours, TIMEZONE, type OpeningPeriod } from '../data/business';
import { whatsappUrl } from '../lib/links';

/* ================================================================ tipos e limites */

export const MAX_QUANTITY = 99;
export const MAX_NAME_LENGTH = 80;
export const MAX_NOTES_LENGTH = 500;

export type Fulfillment = 'retirar' | 'receber';

export interface OrderItem {
  slug: string;
  /** Nome do sabor como está no cardápio, ex.: "Torta de frango". */
  name: string;
  /** Tortas inteiras desse sabor. `NaN` quando o campo está vazio ou não é um número inteiro. */
  quantity: number;
  /** Variação escolhida, ex.: "versão apimentada". */
  variant?: string;
}

export interface OrderDraft {
  items: readonly OrderItem[];
  /** Valor do `<input type="date">`: "AAAA-MM-DD", ou "" se vazio. */
  date: string;
  fulfillment: Fulfillment | '';
  name: string;
  notes: string;
}

/** Campos com mensagem de erro. Quantidades usam a chave `qtd-<slug>`. */
export type OrderField = 'sabores' | 'data' | 'entrega' | 'nome' | 'observacoes' | `qtd-${string}`;
export type OrderErrors = Partial<Record<OrderField, string>>;

export interface ValidationOptions {
  /** Hoje em São Paulo, "AAAA-MM-DD" (use `todayInSaoPaulo()`). */
  today: string;
  /** Horários da casa; dias sem horário não aceitam encomenda. Padrão: `openingHours`. */
  hours?: readonly OpeningPeriod[];
}

export interface PreviewLine {
  kind: 'line' | 'gap' | 'hint';
  text: string;
}

export const EMPTY_DRAFT: OrderDraft = { items: [], date: '', fulfillment: '', name: '', notes: '' };

/* ================================================================ funções puras */

/** Data de hoje no fuso de São Paulo, "AAAA-MM-DD" — o mínimo aceito no campo de data. */
export function todayInSaoPaulo(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** "AAAA-MM-DD" → Date (meia-noite UTC), ou `null` se não for uma data real (ex.: 2026-02-30). */
export function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  const valid =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return valid ? date : null;
}

const longDate = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** "2026-11-14" → "sábado, 14 de novembro de 2026". Datas inválidas voltam como vieram. */
export function formatOrderDate(iso: string): string {
  const date = parseIsoDate(iso);
  return date ? longDate.format(date) : iso;
}

/** Texto do campo "quantidade" → número inteiro, ou `NaN` se vazio/inválido. */
export function parseQuantity(value: string): number {
  const clean = value.trim();
  return /^\d{1,4}$/.test(clean) ? Number(clean) : Number.NaN;
}

const isValidQuantity = (n: number) => Number.isInteger(n) && n >= 1 && n <= MAX_QUANTITY;

/** Uma linha só, sem espaços repetidos. */
const normalizeLine = (text: string) => text.replace(/\s+/g, ' ').trim();

/** Texto livre com quebras de linha preservadas (no máximo uma linha em branco seguida). */
function normalizeNotes(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[^\S\n]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** "Fechado aos domingos" com o artigo certo para cada dia (0 = domingo). */
const CLOSED_ON = [
  'aos domingos',
  'às segundas',
  'às terças',
  'às quartas',
  'às quintas',
  'às sextas',
  'aos sábados',
];

/**
 * Valida a encomenda. Devolve só os campos com problema (objeto vazio = tudo certo),
 * com mensagens prontas para mostrar ao lado de cada campo.
 */
export function validateOrder(
  draft: OrderDraft,
  { today, hours = openingHours }: ValidationOptions,
): OrderErrors {
  const errors: OrderErrors = {};

  if (draft.items.length === 0) errors.sabores = 'Escolha pelo menos um sabor.';
  for (const item of draft.items) {
    if (!isValidQuantity(item.quantity)) errors[`qtd-${item.slug}`] = `Use um número de 1 a ${MAX_QUANTITY}.`;
  }

  if (draft.date === '') {
    errors.data = 'Escolha a data da encomenda.';
  } else {
    const date = parseIsoDate(draft.date);
    if (!date) {
      errors.data = 'Informe uma data válida, no formato dia/mês/ano.';
    } else if (draft.date < today) {
      errors.data = 'Essa data já passou. Escolha hoje ou um dia mais à frente.';
    } else {
      const weekday = date.getUTCDay();
      const open = hours.some((p) => (p.days as readonly number[]).includes(weekday));
      if (!open) errors.data = `A casa fica fechada ${CLOSED_ON[weekday] ?? 'nesse dia'}. Escolha outro dia.`;
    }
  }

  if (draft.fulfillment !== 'retirar' && draft.fulfillment !== 'receber') {
    errors.entrega = 'Diga se você vai retirar na loja ou receber em casa.';
  }

  const name = normalizeLine(draft.name);
  if (name === '') errors.nome = 'Informe seu nome, para a gente saber de quem é a encomenda.';
  else if (name.length > MAX_NAME_LENGTH) errors.nome = `Use até ${MAX_NAME_LENGTH} caracteres.`;

  if (normalizeNotes(draft.notes).length > MAX_NOTES_LENGTH) {
    errors.observacoes = `Use até ${MAX_NOTES_LENGTH} caracteres.`;
  }

  return errors;
}

/** Atalho: a encomenda não tem nenhum erro. */
export function isOrderValid(draft: OrderDraft, options: ValidationOptions): boolean {
  return Object.keys(validateOrder(draft, options)).length === 0;
}

/**
 * Texto da mensagem do WhatsApp. Partes ainda vazias ficam de fora (a mesma função alimenta a
 * prévia enquanto a pessoa preenche). Ex.:
 *
 *   Olá, La Bella Torta! Gostaria de encomendar 3 tortas inteiras:
 *   • 2 × Torta de frango
 *   • 1 × Torta de calabresa (versão apimentada)
 *
 *   Data: sábado, 14 de novembro de 2026
 *   Vou retirar na loja.
 *   Nome: Maria
 *   Observações: …
 */
export function buildOrderMessage(draft: OrderDraft): string {
  const greeting = `Olá, ${business.name}!`;
  const total = draft.items.reduce((sum, i) => sum + (isValidQuantity(i.quantity) ? i.quantity : 0), 0);

  let header: string;
  if (draft.items.length === 0) header = `${greeting} Gostaria de encomendar uma torta inteira.`;
  else if (total === 1) header = `${greeting} Gostaria de encomendar uma torta inteira:`;
  else if (total > 1) header = `${greeting} Gostaria de encomendar ${total} tortas inteiras:`;
  else header = `${greeting} Gostaria de encomendar tortas inteiras:`;

  const items = draft.items.map((item) => {
    const qty = isValidQuantity(item.quantity) ? `${item.quantity} × ` : '';
    const variant = item.variant ? ` (${item.variant})` : '';
    return `• ${qty}${item.name}${variant}`;
  });

  const details: string[] = [];
  if (parseIsoDate(draft.date)) details.push(`Data: ${formatOrderDate(draft.date)}`);
  if (draft.fulfillment === 'retirar') details.push('Vou retirar na loja.');
  if (draft.fulfillment === 'receber') details.push('Prefiro receber em casa. Podemos combinar a entrega?');
  const name = normalizeLine(draft.name);
  if (name) details.push(`Nome: ${name}`);
  const notes = normalizeNotes(draft.notes);
  if (notes) details.push(`Observações: ${notes}`);

  const head = [header, ...items].join('\n');
  return details.length ? `${head}\n\n${details.join('\n')}` : head;
}

/** Link wa.me com a mensagem da encomenda. */
export function orderWhatsappUrl(draft: OrderDraft): string {
  return whatsappUrl(buildOrderMessage(draft));
}

export const PREVIEW_HINT = 'Marque os sabores para montar a mensagem.';

/** Linhas da prévia: a mensagem, linha a linha, com uma dica enquanto nenhum sabor foi marcado. */
export function previewLines(draft: OrderDraft): PreviewLine[] {
  const lines: PreviewLine[] = buildOrderMessage(draft)
    .split('\n')
    .map((text) => (text === '' ? { kind: 'gap', text } : { kind: 'line', text }));
  if (draft.items.length === 0) lines.splice(1, 0, { kind: 'hint', text: PREVIEW_HINT });
  return lines;
}

/* ================================================================ DOM */

const TYPING_DELAY_MS = 350;

/**
 * Liga o formulário `[data-order-form]`: data mínima (hoje em SP), quantidades, prévia ao vivo,
 * validação inline acessível e abertura do WhatsApp. Chamado pelo `<script>` do componente.
 */
export function initOrderForm(root: ParentNode = document): void {
  const form = root.querySelector<HTMLFormElement>('form[data-order-form]');
  const dateInput = form?.querySelector<HTMLInputElement>('input[data-field="data"]');
  const nameInput = form?.querySelector<HTMLInputElement>('input[data-field="nome"]');
  const notesInput = form?.querySelector<HTMLTextAreaElement>('textarea[data-field="observacoes"]');
  const preview = form?.querySelector<HTMLElement>('[data-order-preview]');
  const status = form?.querySelector<HTMLElement>('[data-order-status]');
  if (!form || !dateInput || !nameInput || !notesInput || !preview || !status) return;

  const flavorBoxes = [...form.querySelectorAll<HTMLInputElement>('input[data-flavor-check]')];
  const fields = [
    'sabores',
    ...flavorBoxes.map((b) => `qtd-${b.value}`),
    'data',
    'entrega',
    'nome',
    'observacoes',
  ];

  let today = todayInSaoPaulo();
  dateInput.min = today;
  let attempted = false;
  let typingTimer: number | undefined;
  const touched = new Set<string>();
  const shown = new Set<string>();
  const baseDescribedBy = new Map<Element, string>();
  for (const control of form.querySelectorAll('[data-field]')) {
    baseDescribedBy.set(control, control.getAttribute('aria-describedby') ?? '');
  }

  const rowOf = (box: Element) => box.closest<HTMLElement>('[data-flavor]');
  const fieldOf = (target: EventTarget | null) =>
    target instanceof HTMLElement ? target.dataset['field'] : undefined;

  const readDraft = (): OrderDraft => {
    const items = flavorBoxes
      .filter((box) => box.checked)
      .map((box): OrderItem => {
        const row = rowOf(box);
        const qty = row?.querySelector<HTMLInputElement>('input[data-qty-input]');
        const variant = row?.querySelector<HTMLInputElement>('input[data-variant]');
        const item: OrderItem = {
          slug: box.value,
          name: box.dataset['name'] ?? box.value,
          quantity: qty ? parseQuantity(qty.value) : 1,
        };
        const variantName = variant?.checked ? variant.dataset['variant'] : undefined;
        return variantName ? { ...item, variant: variantName } : item;
      });
    const fulfillment = form.querySelector<HTMLInputElement>('input[data-field="entrega"]:checked')?.value;
    return {
      items,
      date: dateInput.value,
      fulfillment: fulfillment === 'retirar' || fulfillment === 'receber' ? fulfillment : '',
      name: nameInput.value,
      notes: notesInput.value,
    };
  };

  /* Prévia: só troca as linhas que mudaram, para o leitor de tela anunciar apenas a diferença. */
  const renderPreview = (draft: OrderDraft): void => {
    const lines = previewLines(draft);
    lines.forEach((line, i) => {
      let el = preview.children.item(i);
      if (!el) {
        el = document.createElement('span');
        preview.append(el);
      }
      const className = `bubble__${line.kind}`;
      if (el.className !== className) el.className = className;
      if (el.textContent !== line.text) el.textContent = line.text;
      el.toggleAttribute('aria-hidden', line.kind === 'gap');
    });
    while (preview.children.length > lines.length) preview.lastElementChild?.remove();
  };

  const setError = (field: string, message: string | undefined): void => {
    const errorEl = form.querySelector<HTMLElement>(`[data-error-for="${field}"]`);
    if (errorEl) {
      if (errorEl.textContent !== (message ?? '')) errorEl.textContent = message ?? '';
      errorEl.hidden = !message;
    }
    for (const control of form.querySelectorAll<HTMLElement>(`[data-field="${field}"]`)) {
      const base = baseDescribedBy.get(control) ?? '';
      const ids = message && errorEl ? [base, errorEl.id].filter(Boolean).join(' ') : base;
      if (message) control.setAttribute('aria-invalid', 'true');
      else control.removeAttribute('aria-invalid');
      if (ids) control.setAttribute('aria-describedby', ids);
      else control.removeAttribute('aria-describedby');
    }
    if (message) shown.add(field);
    else shown.delete(field);
  };

  const setStatus = (state: 'error' | 'ok' | '', ...content: (string | Node)[]): void => {
    if (state) status.dataset['state'] = state;
    else delete status.dataset['state'];
    status.replaceChildren(...content);
  };

  const errorSummary = (count: number) =>
    count === 1
      ? 'Falta acertar 1 campo antes de enviar.'
      : `Faltam acertar ${count} campos antes de enviar.`;

  /**
   * Atualiza prévia, erros e aviso geral. O erro de um campo só aparece depois que a pessoa mexeu
   * nele (ou tentou enviar) e some assim que o campo fica certo.
   */
  const sync = (): OrderErrors => {
    const draft = readDraft();
    renderPreview(draft);
    const errors = validateOrder(draft, { today });
    for (const field of fields) {
      const visible = attempted || touched.has(field) || shown.has(field);
      setError(field, visible ? errors[field as OrderField] : undefined);
    }
    const count = Object.keys(errors).length;
    if (status.dataset['state'] === 'error') {
      if (count === 0) setStatus('');
      else if (status.textContent !== errorSummary(count)) setStatus('error', errorSummary(count));
    } else if (status.dataset['state'] === 'ok') {
      setStatus(''); // a mensagem mudou: o link anterior ficou velho
    }
    return errors;
  };

  const syncRow = (box: HTMLInputElement): void => {
    const row = rowOf(box);
    if (!row) return;
    for (const extra of row.querySelectorAll<HTMLElement>('[data-flavor-extra]')) extra.hidden = !box.checked;
    const qty = row.querySelector<HTMLInputElement>('input[data-qty-input]');
    if (box.checked && qty && Number.isNaN(parseQuantity(qty.value))) qty.value = '1';
  };

  form.addEventListener('input', (event) => {
    if (event.target instanceof HTMLInputElement && event.target.type === 'checkbox') return; // vai pelo "change"
    window.clearTimeout(typingTimer);
    typingTimer = window.setTimeout(sync, TYPING_DELAY_MS);
  });

  form.addEventListener('change', (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.dataset['flavorCheck'] !== undefined) syncRow(target);
    const field = fieldOf(target);
    if (field) touched.add(field);
    window.clearTimeout(typingTimer);
    sync();
  });

  form.addEventListener('click', (event) => {
    const button =
      event.target instanceof Element ? event.target.closest<HTMLElement>('[data-qty-step]') : null;
    const input = button?.closest('[data-qty]')?.querySelector<HTMLInputElement>('input[data-qty-input]');
    if (!button || !input) return;
    const current = parseQuantity(input.value);
    const next = (Number.isNaN(current) ? 0 : current) + Number(button.dataset['qtyStep'] ?? 0);
    input.value = String(Math.min(MAX_QUANTITY, Math.max(1, next)));
    const field = fieldOf(input);
    if (field) touched.add(field);
    sync();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    attempted = true;
    today = todayInSaoPaulo();
    dateInput.min = today;
    window.clearTimeout(typingTimer);
    const errors = sync();
    const count = Object.keys(errors).length;

    if (count > 0) {
      setStatus('error', errorSummary(count));
      form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }

    const url = orderWhatsappUrl(readDraft());
    window.open(url, '_blank', 'noopener');
    window.plausible?.('Clique WhatsApp', {
      props: { origem: 'encomenda-formulario', pagina: location.pathname },
    });

    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'toque aqui para abrir';
    setStatus('ok', 'Pronto! O WhatsApp abriu numa nova aba com a sua mensagem. Se não abriu, ', link, '.');
  });

  /* Ao voltar pelo histórico o navegador restaura os campos: linhas e prévia acompanham. */
  const restore = () => {
    flavorBoxes.forEach(syncRow);
    renderPreview(readDraft());
  };
  window.addEventListener('pageshow', restore);
  restore();
}
