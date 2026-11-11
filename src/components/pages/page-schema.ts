/**
 * Dados estruturados das páginas institucionais (AboutPage, ContactPage): uma página simples
 * que aponta para o restaurante (`restaurantId`) e para o site — sem repetir nenhum fato.
 */
import { absoluteUrl } from '../../lib/links';
import { restaurantId, type JsonLd } from '../../lib/schema';

export type InstitutionalPageType = 'AboutPage' | 'ContactPage';

export interface InstitutionalPage {
  path: string;
  name: string;
  description: string;
}

export function institutionalPageSchema(
  type: InstitutionalPageType,
  page: InstitutionalPage,
  site: URL | undefined,
): JsonLd {
  const homeUrl = absoluteUrl('/', site);
  const url = absoluteUrl(page.path, site);
  const restaurant = { '@id': restaurantId({ homeUrl, abs: (p) => absoluteUrl(p, site) }) };
  return {
    '@context': 'https://schema.org',
    '@type': type,
    '@id': `${url}#pagina`,
    url,
    name: page.name,
    description: page.description,
    inLanguage: 'pt-BR',
    isPartOf: { '@id': `${homeUrl}#site` },
    about: restaurant,
    mainEntity: restaurant,
  };
}
