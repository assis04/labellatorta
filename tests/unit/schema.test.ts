/**
 * Dados estruturados: é por eles que Google, Bing e as IAs entendem endereço, horário e
 * cardápio. Nenhum fato não confirmado (preço, CEP) pode aparecer no schema.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type * as BusinessModule from '../../src/data/business';
import { business, links, openingHours } from '../../src/data/business';
import { faq } from '../../src/data/content';
import type * as MenuModule from '../../src/data/menu';
import { tortas, type Torta } from '../../src/data/menu';
import {
  breadcrumbSchema,
  faqSchema,
  menuItemSchema,
  menuSchema,
  restaurantId,
  restaurantSchema,
  serializeJsonLd,
  websiteSchema,
  type JsonLd,
  type SchemaContext,
} from '../../src/lib/schema';

const ORIGIN = 'https://www.labellatorta.com.br';
const ctx: SchemaContext = {
  homeUrl: `${ORIGIN}/`,
  abs: (path) => new URL(path, ORIGIN).toString(),
  imageUrl: `${ORIGIN}/_astro/share.jpg`,
};

const SCHEMA_DAYS = new Set(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);

const firstTorta = (): Torta => {
  const t = tortas[0];
  if (!t) throw new Error('O cardápio está vazio');
  return t;
};

/** Itens do cardápio dentro de um schema `Menu`, achatados. */
function menuItems(menu: JsonLd): JsonLd[] {
  const sections = menu['hasMenuSection'] as JsonLd[];
  return sections.flatMap((s) => s['hasMenuItem'] as JsonLd[]);
}

afterEach(() => {
  vi.doUnmock('../../src/data/business');
  vi.doUnmock('../../src/data/menu');
  vi.resetModules();
});

describe('restaurantSchema', () => {
  const r = restaurantSchema(ctx);

  it('identifica um Restaurant com @id estável na home', () => {
    expect(r['@context']).toBe('https://schema.org');
    expect(r['@type']).toBe('Restaurant');
    expect(r['@id']).toBe(`${ORIGIN}/#restaurante`);
    expect(r['@id']).toBe(restaurantId(ctx));
    expect(r['name']).toBe(business.name);
    expect(r['url']).toBe(ctx.homeUrl);
    expect(r['telephone']).toBe(business.phone.e164);
    expect(r['image']).toBe(ctx.imageUrl);
    expect(r['hasMenu']).toBe(`${ORIGIN}/cardapio/`);
    expect(r['hasMap']).toBe(links.googleMaps);
  });

  it('tem endereço postal completo', () => {
    expect(r['address']).toMatchObject({
      '@type': 'PostalAddress',
      streetAddress: business.address.street,
      addressLocality: 'São Paulo',
      addressRegion: 'SP',
      addressCountry: 'BR',
    });
  });

  it('omite postalCode e foundingDate enquanto não foram confirmados', () => {
    if (business.address.postalCode === null) {
      expect(r['address']).not.toHaveProperty('postalCode');
    } else {
      expect(r['address']).toHaveProperty('postalCode', business.address.postalCode);
    }
    if (business.foundedYear === null) expect(r).not.toHaveProperty('foundingDate');
  });

  it('inclui postalCode e foundingDate quando a casa confirmar', async () => {
    vi.resetModules();
    vi.doMock('../../src/data/business', async (importOriginal) => {
      const original = await importOriginal<typeof BusinessModule>();
      return {
        ...original,
        business: {
          ...original.business,
          foundedYear: 2015,
          address: { ...original.business.address, postalCode: '03087-000' },
        },
      };
    });
    const schema = await import('../../src/lib/schema');
    const withCep = schema.restaurantSchema(ctx);
    expect(withCep['address']).toHaveProperty('postalCode', '03087-000');
    expect(withCep['foundingDate']).toBe('2015');
  });

  it('tem coordenadas geográficas', () => {
    expect(r['geo']).toEqual({
      '@type': 'GeoCoordinates',
      latitude: business.geo.latitude,
      longitude: business.geo.longitude,
    });
  });

  it('descreve os horários com os dias em inglês do schema.org', () => {
    const specs = r['openingHoursSpecification'] as JsonLd[];
    expect(specs).toEqual([
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '11:00',
        closes: '21:00',
      },
      { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Saturday'], opens: '11:00', closes: '16:00' },
    ]);
    expect(specs).toHaveLength(openingHours.length);
    for (const spec of specs) {
      for (const day of spec['dayOfWeek'] as string[]) expect(SCHEMA_DAYS).toContain(day);
      expect(spec['opens']).toMatch(/^\d{2}:\d{2}$/);
      expect(spec['closes']).toMatch(/^\d{2}:\d{2}$/);
    }
  });

  it('liga os perfis oficiais em sameAs', () => {
    expect(r['sameAs']).toEqual([business.social.instagram, business.social.facebook]);
    for (const url of r['sameAs'] as string[]) expect(url).toMatch(/^https:\/\//);
  });

  it('cita só o prêmio confirmado', () => {
    expect(r['award']).toBe('Recomendado pelo Restaurant Guru 2026');
  });

  it('não inclui imagem quando o contexto não tem uma', () => {
    expect(restaurantSchema({ homeUrl: ctx.homeUrl, abs: ctx.abs })).not.toHaveProperty('image');
  });
});

describe('websiteSchema', () => {
  it('aponta o Restaurant como publisher', () => {
    const w = websiteSchema(ctx);
    expect(w['@type']).toBe('WebSite');
    expect(w['inLanguage']).toBe('pt-BR');
    expect(w['publisher']).toEqual({ '@id': restaurantId(ctx) });
  });
});

describe('menuSchema', () => {
  const menu = menuSchema(ctx);
  const items = menuItems(menu);

  it('é um Menu com seções de tortas salgadas e doces', () => {
    expect(menu['@type']).toBe('Menu');
    expect(menu['url']).toBe(`${ORIGIN}/cardapio/`);
    const sections = menu['hasMenuSection'] as JsonLd[];
    expect(sections.map((s) => s['name'])).toEqual(['Tortas salgadas', 'Tortas doces']);
  });

  it('lista todas as tortas, cada uma com a URL da sua página', () => {
    expect(items).toHaveLength(tortas.length);
    for (const t of tortas) {
      const item = items.find((i) => i['name'] === t.name);
      expect(item, t.name).toBeDefined();
      expect(item?.['@type']).toBe('MenuItem');
      expect(item?.['url']).toBe(`${ORIGIN}/tortas/${t.slug}/`);
      expect(item?.['description']).toBe(t.summary);
    }
  });

  it('não publica offers para torta com preço ainda não informado', () => {
    for (const t of tortas.filter((x) => x.price.slice === null && x.price.whole === null)) {
      const item = items.find((i) => i['name'] === t.name);
      expect(item, t.name).not.toHaveProperty('offers');
    }
  });

  it('publica Offer em BRL para a torta que tiver preço', async () => {
    vi.resetModules();
    vi.doMock('../../src/data/menu', async (importOriginal) => {
      const original = await importOriginal<typeof MenuModule>();
      const [first, ...rest] = original.tortas;
      if (!first) throw new Error('O cardápio está vazio');
      return { ...original, tortas: [{ ...first, price: { slice: 15, whole: 95 } }, ...rest] };
    });
    const schema = await import('../../src/lib/schema');
    const priced = menuItems(schema.menuSchema(ctx));
    const t = firstTorta();
    expect(priced.find((i) => i['name'] === t.name)?.['offers']).toEqual([
      { '@type': 'Offer', name: 'Fatia', price: '15.00', priceCurrency: 'BRL' },
      { '@type': 'Offer', name: 'Torta inteira', price: '95.00', priceCurrency: 'BRL' },
    ]);
    const others = priced.filter((i) => i['name'] !== t.name);
    for (const item of others) {
      const source = tortas.find((x) => x.name === item['name']);
      if (source?.price.slice === null && source.price.whole === null)
        expect(item).not.toHaveProperty('offers');
    }
  });

  it('marca as vegetarianas com suitableForDiet', () => {
    for (const t of tortas) {
      const item = items.find((i) => i['name'] === t.name);
      if (t.tags.includes('vegetariana')) {
        expect(item?.['suitableForDiet']).toBe('https://schema.org/VegetarianDiet');
      } else {
        expect(item).not.toHaveProperty('suitableForDiet');
      }
    }
  });
});

describe('menuItemSchema', () => {
  it('sem preço, não tem offers', () => {
    const t: Torta = { ...firstTorta(), price: { slice: null, whole: null } };
    expect(menuItemSchema(t, ctx)).not.toHaveProperty('offers');
  });

  it('com preço, publica Offer em BRL com duas casas decimais', () => {
    const t: Torta = { ...firstTorta(), price: { slice: 14, whole: 89.9 } };
    expect(menuItemSchema(t, ctx)['offers']).toEqual([
      { '@type': 'Offer', name: 'Fatia', price: '14.00', priceCurrency: 'BRL' },
      { '@type': 'Offer', name: 'Torta inteira', price: '89.90', priceCurrency: 'BRL' },
    ]);
  });

  it('com só um dos preços, publica só aquela Offer', () => {
    const t: Torta = { ...firstTorta(), price: { slice: null, whole: 120 } };
    expect(menuItemSchema(t, ctx)['offers']).toEqual([
      { '@type': 'Offer', name: 'Torta inteira', price: '120.00', priceCurrency: 'BRL' },
    ]);
  });

  it('inclui a imagem só quando informada', () => {
    const t = firstTorta();
    expect(menuItemSchema(t, ctx)).not.toHaveProperty('image');
    expect(menuItemSchema(t, ctx, `${ORIGIN}/_astro/x.jpg`)['image']).toBe(`${ORIGIN}/_astro/x.jpg`);
  });
});

describe('faqSchema', () => {
  it('gera FAQPage com uma Question/Answer por pergunta', () => {
    const f = faqSchema(faq);
    expect(f['@type']).toBe('FAQPage');
    const entities = f['mainEntity'] as JsonLd[];
    expect(entities).toHaveLength(faq.length);
    entities.forEach((q, i) => {
      expect(q).toEqual({
        '@type': 'Question',
        name: faq[i]?.question,
        acceptedAnswer: { '@type': 'Answer', text: faq[i]?.answer },
      });
    });
  });
});

describe('breadcrumbSchema', () => {
  it('numera as posições a partir de 1 com URLs absolutas', () => {
    const b = breadcrumbSchema(
      [
        { name: 'Início', path: '/' },
        { name: 'Cardápio', path: '/cardapio/' },
        { name: 'Torta de frango', path: '/tortas/torta-de-frango/' },
      ],
      ctx,
    );
    expect(b['@type']).toBe('BreadcrumbList');
    expect(b['itemListElement']).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Início', item: `${ORIGIN}/` },
      { '@type': 'ListItem', position: 2, name: 'Cardápio', item: `${ORIGIN}/cardapio/` },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Torta de frango',
        item: `${ORIGIN}/tortas/torta-de-frango/`,
      },
    ]);
  });
});

describe('serializeJsonLd', () => {
  it('escapa "<" para que o conteúdo não feche a tag <script>', () => {
    const data = { '@type': 'Thing', name: '</script><script>alert(1)</script><!--' };
    const out = serializeJsonLd(data);
    expect(out).not.toContain('<');
    expect(out).toContain('\\u003c/script>');
    expect(JSON.parse(out)).toEqual(data);
  });

  it('serializa listas e preserva o conteúdo', () => {
    const list = [restaurantSchema(ctx), websiteSchema(ctx)];
    expect(JSON.parse(serializeJsonLd(list))).toEqual(list);
  });
});
