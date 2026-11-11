/**
 * Construção de URLs: respeita o base path (GitHub Pages em subcaminho) e gera
 * links de WhatsApp com mensagem pronta. Nenhum componente monta URL "na mão".
 */
import { business } from '../data/business';

const BASE = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;

/** Caminho interno com o base path aplicado. `href('/cardapio/')` → "/repo/cardapio/". */
export function href(path: string): string {
  if (/^(https?:|mailto:|tel:|#)/.test(path)) return path;
  const clean = path.replace(/^\/+/, '');
  return `${BASE}${clean}`;
}

/** URL absoluta (canonical, Open Graph, schema). Precisa do `Astro.site`. */
export function absoluteUrl(path: string, site: URL | undefined): string {
  if (!site) throw new Error('Defina `site` no astro.config.mjs para gerar URLs absolutas');
  return new URL(href(path), site).toString();
}

export const WHATSAPP_MESSAGES = {
  pedido: 'Olá, La Bella Torta! Gostaria de fazer um pedido.',
  encomenda: 'Olá, La Bella Torta! Gostaria de encomendar uma torta inteira.',
  almoco: 'Olá, La Bella Torta! Gostaria de saber o cardápio do almoço de hoje.',
} as const;

export type WhatsappIntent = keyof typeof WHATSAPP_MESSAGES;

/** Link wa.me com mensagem pré-preenchida (texto livre ou uma intenção pronta). */
export function whatsappUrl(message: WhatsappIntent | (string & {}) = 'pedido'): string {
  const text = Object.hasOwn(WHATSAPP_MESSAGES, message)
    ? WHATSAPP_MESSAGES[message as WhatsappIntent]
    : message;
  return `https://wa.me/${business.whatsappNumber}?text=${encodeURIComponent(text)}`;
}

/** Mensagem de encomenda de um sabor específico. */
export function whatsappOrderUrl(tortaName: string): string {
  return whatsappUrl(`Olá, La Bella Torta! Gostaria de encomendar uma ${tortaName.toLowerCase()} inteira.`);
}

export const telUrl = `tel:${business.phone.e164}`;
export const mailUrl = `mailto:${business.email}`;
