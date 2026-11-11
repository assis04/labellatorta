/**
 * llms.txt (https://llmstxt.org): resumo factual da casa em Markdown para assistentes de IA.
 * Gerado 100% a partir de src/data — nenhum fato é escrito aqui. Campos `null` (preço, CEP)
 * são omitidos. Links absolutos, com o base path aplicado.
 */
import type { APIRoute } from 'astro';
import { business, fullAddress, links, openingHours } from '../data/business';
import { faq, footerNav } from '../data/content';
import type { Torta } from '../data/menu';
import { doces, formatPrice, salgadas, tagLabels, tortas } from '../data/menu';
import { hoursTable } from '../lib/hours';
import { absoluteUrl, whatsappUrl } from '../lib/links';

const PRIVACY_PATH = '/politica-de-privacidade/';
const FAQ_PATH = '/perguntas-frequentes/';

/** Resumo de cada página do site para quem decide qual link abrir. */
const PAGE_NOTES: Record<string, string> = {
  '/cardapio/': `Os ${tortas.length} sabores de torta, salgados e doces, com ingredientes.`,
  '/almoco/': 'Almoço com fatia de torta salgada e salada da casa.',
  '/encomendas/': 'Tortas inteiras por encomenda, combinadas pelo WhatsApp.',
  '/contato/': 'Endereço, mapa, horário de funcionamento e WhatsApp.',
  [FAQ_PATH]: 'Respostas sobre endereço, horário, pedidos, encomendas e opções vegetarianas.',
};

/** Texto de link Markdown: colchetes escapados. */
const linkText = (text: string) => text.replace(/[[\]\\]/g, '\\$&');
const item = (title: string, url: string, notes?: string) =>
  `- [${linkText(title)}](${url})${notes ? `: ${notes}` : ''}`;

function hoursText(): string {
  return hoursTable(openingHours)
    .map((row) => `${row.label}, ${row.value === 'Fechado' ? 'fechado' : row.value}`)
    .join('; ');
}

function tortaNotes(t: Torta): string {
  const parts = [t.summary];
  const tags = t.tags.map((tag) => tagLabels[tag]);
  if (tags.length) parts.push(`${tags.join('. ')}.`);
  parts.push(`Ingredientes: ${t.ingredients.join(', ')}.`);
  const slice = formatPrice(t.price.slice);
  const whole = formatPrice(t.price.whole);
  const prices = [slice && `fatia ${slice}`, whole && `torta inteira ${whole}`].filter(Boolean);
  if (prices.length) parts.push(`Preço: ${prices.join('; ')}.`);
  return parts.join(' ');
}

export const GET: APIRoute = ({ site }) => {
  const abs = (path: string) => absoluteUrl(path, site);
  const { address, social, phone } = business;
  const postal = address.postalCode ? `, CEP ${address.postalCode}` : '';

  const pages = footerNav.filter((nav) => nav.path !== PRIVACY_PATH);
  const privacy = footerNav.find((nav) => nav.path === PRIVACY_PATH);

  const lines = [
    `# ${business.name}`,
    '',
    `> ${business.description}`,
    '',
    `${business.tagline}. Slogan: "${business.slogan}".`,
    '',
    `- Endereço: ${fullAddress}${postal} (região do ${address.district}). Mapa: ${links.googleMaps}`,
    `- Horário de funcionamento (horário de Brasília): ${hoursText()}.`,
    `- WhatsApp e telefone: ${phone.display} — ${whatsappUrl()}`,
    `- E-mail: ${business.email}`,
    `- Instagram: ${social.instagramHandle} — ${social.instagram}`,
    `- Facebook: ${social.facebook}`,
    `- Reconhecimento: ${business.award.name} (${business.award.year}).`,
    '',
    '## Tortas salgadas',
    '',
    ...salgadas.map((t) => item(t.name, abs(`/tortas/${t.slug}/`), tortaNotes(t))),
    '',
    '## Tortas doces',
    '',
    ...doces.map((t) => item(t.name, abs(`/tortas/${t.slug}/`), tortaNotes(t))),
    '',
    '## Páginas',
    '',
    item('Início', abs('/')),
    ...pages.map((nav) => item(nav.label, abs(nav.path), PAGE_NOTES[nav.path])),
    '',
    '## Perguntas frequentes',
    '',
    ...faq.map((q) => item(q.question, abs(FAQ_PATH), q.answer)),
    '',
    '## Optional',
    '',
    item('Avaliações no Google', links.googleReviews),
    ...(privacy ? [item(privacy.label, abs(privacy.path))] : []),
    '',
  ];

  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
