/**
 * Textos derivados do cardápio (src/data/menu.ts): títulos e descriptions de SEO, nomes curtos e
 * listas em português. Os limites de SEO são verificados no build — se nenhum candidato couber,
 * o build falha com uma mensagem clara, em vez de publicar um título cortado no Google.
 */
import { business } from '../../data/business';
import type { Torta } from '../../data/menu';

/** O layout acrescenta este sufixo ao `title`, exceto com `fullTitle`. */
export const TITLE_SUFFIX = ` · ${business.name}`;
export const TITLE_MAX = 60;
export const DESCRIPTION_MIN = 120;
export const DESCRIPTION_MAX = 160;

const conjunction = new Intl.ListFormat('pt-BR', { style: 'long', type: 'conjunction' });

/** ["a", "b", "c"] → "a, b e c". */
export function joinList(items: readonly string[]): string {
  return conjunction.format(items);
}

/** "Torta de frango" → "frango"; "Torta banoffee" → "banoffee". */
export function shortName(torta: Pick<Torta, 'name'>): string {
  return torta.name.replace(/^torta\s+(?:de\s+)?/i, '');
}

/** "Torta de frango" → "torta de frango", para uso no meio da frase. */
export function inSentence(name: string): string {
  return name.toLocaleLowerCase('pt-BR');
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLocaleLowerCase('pt-BR') + text.slice(1);
}

/** Primeiro texto cujo tamanho fica dentro de [min, max]; falha o build se nenhum couber. */
export function pickWithin(candidates: readonly string[], min: number, max: number, what: string): string {
  const found = candidates.find((c) => c.length >= min && c.length <= max);
  if (found === undefined) {
    const sizes = candidates.map((c) => c.length).join(', ');
    throw new Error(`${what}: nenhum texto entre ${min} e ${max} caracteres (candidatos: ${sizes})`);
  }
  return found;
}

export interface PageTitle {
  title: string;
  fullTitle: boolean;
}

/** Título da página do sabor, com o bairro quando couber em 60 caracteres (contando o sufixo). */
export function tortaTitle(torta: Torta): PageTitle {
  const candidates = [`${torta.name} no ${business.address.neighborhood}`, torta.name];
  const withSuffix = candidates.find((c) => `${c}${TITLE_SUFFIX}`.length <= TITLE_MAX);
  if (withSuffix !== undefined) return { title: withSuffix, fullTitle: false };
  if (torta.name.length <= TITLE_MAX) return { title: torta.name, fullTitle: true };
  throw new Error(`Título de ${torta.slug}: "${torta.name}" passa de ${TITLE_MAX} caracteres`);
}

/** Meta description do sabor (120–160 caracteres), citando o sabor e onde fica a casa. */
export function tortaDescription(torta: Torta): string {
  const { neighborhood } = business.address;
  const lead = `${torta.name}: ${lowerFirst(torta.summary)}`;
  return pickWithin(
    [
      `${lead} Na fatia ou inteira, no ${neighborhood}, Zona Leste de São Paulo.`,
      `${lead} Na fatia ou inteira, no ${neighborhood}, Zona Leste de SP.`,
      `${lead} No ${neighborhood}, Zona Leste de São Paulo.`,
      `${lead} No ${neighborhood}, Zona Leste de SP.`,
      `${torta.name} na fatia ou inteira, no ${neighborhood}, Zona Leste de São Paulo. Peça pelo WhatsApp ${business.phone.display}.`,
    ],
    DESCRIPTION_MIN,
    DESCRIPTION_MAX,
    `Description de ${torta.slug}`,
  );
}

/** Mensagem do WhatsApp para pedir um sabor (fatia ou inteira). */
export function orderMessage(torta: Pick<Torta, 'name'>): string {
  return `Olá, ${business.name}! Gostaria de fazer um pedido de ${inSentence(torta.name)}.`;
}
