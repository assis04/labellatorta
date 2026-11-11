/**
 * Dados estruturados (schema.org / JSON-LD). É por aqui que Google, Bing e as IAs
 * entendem que a página é de um restaurante, onde fica, quando abre e o que serve.
 * Tudo deriva de src/data — nenhum fato é repetido à mão.
 */
import { business, links, openingHours } from '../data/business';
import type { FaqItem } from '../data/content';
import type { Torta } from '../data/menu';
import { tortas } from '../data/menu';
import { schemaDayNames } from './hours';

export type JsonLd = Record<string, unknown>;

export interface SchemaContext {
  /** URL absoluta da home (com base path), ex.: https://www.labellatorta.com.br/ */
  homeUrl: string;
  /** Converte caminho interno em URL absoluta. */
  abs: (path: string) => string;
  /** URL absoluta de uma imagem otimizada (para `image`). */
  imageUrl?: string;
}

export const restaurantId = (ctx: SchemaContext) => `${ctx.homeUrl}#restaurante`;

export function restaurantSchema(ctx: SchemaContext): JsonLd {
  const { address } = business;
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    '@id': restaurantId(ctx),
    name: business.name,
    description: business.description,
    slogan: business.slogan,
    url: ctx.homeUrl,
    ...(ctx.imageUrl ? { image: ctx.imageUrl } : {}),
    telephone: business.phone.e164,
    email: business.email,
    servesCuisine: [...business.servesCuisine],
    priceRange: business.priceRange,
    acceptsReservations: business.acceptsReservations,
    ...(business.foundedYear ? { foundingDate: String(business.foundedYear) } : {}),
    address: {
      '@type': 'PostalAddress',
      streetAddress: address.street,
      addressLocality: address.city,
      addressRegion: address.state,
      addressCountry: address.country,
      ...(address.postalCode ? { postalCode: address.postalCode } : {}),
    },
    geo: { '@type': 'GeoCoordinates', latitude: business.geo.latitude, longitude: business.geo.longitude },
    hasMap: links.googleMaps,
    areaServed: { '@type': 'City', name: address.city },
    openingHoursSpecification: openingHours.map((p) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: schemaDayNames(p.days),
      opens: p.opens,
      closes: p.closes,
    })),
    hasMenu: ctx.abs('/cardapio/'),
    award: `${business.award.name} ${business.award.year}`,
    sameAs: [business.social.instagram, business.social.facebook],
  };
}

export function websiteSchema(ctx: SchemaContext): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${ctx.homeUrl}#site`,
    name: business.name,
    url: ctx.homeUrl,
    inLanguage: 'pt-BR',
    publisher: { '@id': restaurantId(ctx) },
  };
}

function offers(t: Torta): JsonLd[] {
  const list: JsonLd[] = [];
  if (t.price.slice !== null)
    list.push({ '@type': 'Offer', name: 'Fatia', price: t.price.slice.toFixed(2), priceCurrency: 'BRL' });
  if (t.price.whole !== null)
    list.push({
      '@type': 'Offer',
      name: 'Torta inteira',
      price: t.price.whole.toFixed(2),
      priceCurrency: 'BRL',
    });
  return list;
}

export function menuItemSchema(t: Torta, ctx: SchemaContext, imageUrl?: string): JsonLd {
  const o = offers(t);
  return {
    '@type': 'MenuItem',
    '@id': `${ctx.abs(`/tortas/${t.slug}/`)}#item`,
    name: t.name,
    description: t.summary,
    url: ctx.abs(`/tortas/${t.slug}/`),
    ...(imageUrl ? { image: imageUrl } : {}),
    ...(t.tags.includes('vegetariana') ? { suitableForDiet: 'https://schema.org/VegetarianDiet' } : {}),
    ...(o.length ? { offers: o } : {}),
  };
}

export function menuSchema(ctx: SchemaContext, imageUrls: Record<string, string> = {}): JsonLd {
  const section = (name: string, category: Torta['category']) => ({
    '@type': 'MenuSection',
    name,
    hasMenuItem: tortas
      .filter((t) => t.category === category)
      .map((t) => menuItemSchema(t, ctx, imageUrls[t.slug])),
  });
  return {
    '@context': 'https://schema.org',
    '@type': 'Menu',
    '@id': `${ctx.abs('/cardapio/')}#cardapio`,
    name: `Cardápio da ${business.name}`,
    inLanguage: 'pt-BR',
    url: ctx.abs('/cardapio/'),
    hasMenuSection: [section('Tortas salgadas', 'salgada'), section('Tortas doces', 'doce')],
  };
}

export function faqSchema(items: readonly FaqItem[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((i) => ({
      '@type': 'Question',
      name: i.question,
      acceptedAnswer: { '@type': 'Answer', text: i.answer },
    })),
  };
}

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbSchema(crumbs: readonly Crumb[], ctx: SchemaContext): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: ctx.abs(c.path),
    })),
  };
}

/**
 * Serializa para dentro de <script type="application/ld+json">. Escapa "<" para que
 * nenhum texto de conteúdo consiga fechar a tag de script (defesa contra injeção).
 */
export function serializeJsonLd(data: JsonLd | JsonLd[]): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
