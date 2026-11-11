/**
 * Integridade da fonte única de dados (src/data). Tudo o que está aqui vira texto de página,
 * schema e llms.txt — um placeholder esquecido ou um alt pobre vaza para o site inteiro.
 */
import { describe, expect, it } from 'vitest';
import * as businessData from '../../src/data/business';
import * as contentData from '../../src/data/content';
import * as menuData from '../../src/data/menu';
import { PLACEHOLDER_PATTERNS } from '../placeholders';

const { business, openingHours } = businessData;
const { faq, footerNav, mainNav, reviews } = contentData;
const { destaques, doces, formatPrice, getTorta, salgadas, tortas, vegetarianas } = menuData;

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const OFFICIAL_ROUTES = [
  '/',
  '/cardapio/',
  '/almoco/',
  '/encomendas/',
  '/sobre/',
  '/contato/',
  '/perguntas-frequentes/',
  '/politica-de-privacidade/',
];

/** Todas as strings de um valor, com o caminho de onde vieram (para a mensagem de erro). */
function collectStrings(value: unknown, path: string, out: [string, string][] = []): [string, string][] {
  if (typeof value === 'string') out.push([path, value]);
  else if (Array.isArray(value)) value.forEach((v, i) => collectStrings(v, `${path}[${i}]`, out));
  else if (value && typeof value === 'object' && !(value instanceof Date)) {
    for (const [k, v] of Object.entries(value)) {
      // ImageMetadata (src das fotos) não é texto editorial.
      if (k === 'src' && v && typeof v === 'object' && 'format' in v) continue;
      collectStrings(v, `${path}.${k}`, out);
    }
  }
  return out;
}

const allPhotos = tortas.flatMap((t) => [t.photo, ...t.gallery].map((p) => ({ torta: t.slug, ...p })));

describe('tortas', () => {
  it('tem slugs únicos em kebab-case', () => {
    const slugs = tortas.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug, slug).toMatch(KEBAB_CASE);
  });

  it('tem nomes únicos', () => {
    const names = tortas.map((t) => t.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it('tem summary de até 120 caracteres (cabe em card e meta description)', () => {
    for (const t of tortas) {
      expect(t.summary.trim().length, t.slug).toBeGreaterThan(0);
      expect(t.summary.length, `${t.slug}: "${t.summary}"`).toBeLessThanOrEqual(120);
    }
  });

  it('tem descrição e ingredientes', () => {
    for (const t of tortas) {
      expect(t.description.trim().length, t.slug).toBeGreaterThan(0);
      expect(t.ingredients.length, t.slug).toBeGreaterThan(0);
      for (const i of t.ingredients) expect(i.trim().length, t.slug).toBeGreaterThan(0);
    }
  });

  it('toda foto tem alt descritivo (≥ 15 caracteres)', () => {
    expect(allPhotos.length).toBeGreaterThan(0);
    for (const p of allPhotos) {
      expect(p.alt.trim().length, `${p.torta}: "${p.alt}"`).toBeGreaterThanOrEqual(15);
    }
  });

  it('não repete o mesmo alt em fotos diferentes', () => {
    const alts = allPhotos.map((p) => p.alt);
    expect(new Set(alts).size).toBe(alts.length);
  });

  it('tem preço nulo (não confirmado) ou um valor positivo', () => {
    for (const t of tortas) {
      for (const value of [t.price.slice, t.price.whole]) {
        if (value !== null) {
          expect(Number.isFinite(value), t.slug).toBe(true);
          expect(value, t.slug).toBeGreaterThan(0);
        }
      }
    }
  });

  it('separa salgadas e doces sem sobra nem sobreposição', () => {
    expect(salgadas.length + doces.length).toBe(tortas.length);
    expect(salgadas.every((t) => t.category === 'salgada')).toBe(true);
    expect(doces.every((t) => t.category === 'doce')).toBe(true);
    expect(vegetarianas.every((t) => t.tags.includes('vegetariana'))).toBe(true);
  });

  it('getTorta encontra cada sabor e falha para slug inexistente', () => {
    for (const t of tortas) expect(getTorta(t.slug)).toBe(t);
    expect(() => getTorta('torta-que-nao-existe')).toThrow();
  });

  it('formatPrice usa reais e devolve null para preço não informado', () => {
    expect(formatPrice(null)).toBeNull();
    expect(formatPrice(12)?.replace(/\s/gu, ' ')).toBe('R$ 12,00');
  });
});

describe('destaques', () => {
  it('existem no cardápio e não se repetem', () => {
    expect(destaques.length).toBeGreaterThan(0);
    for (const d of destaques) expect(tortas, d.slug).toContain(d);
    const slugs = destaques.map((d) => d.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('incluem salgadas e doces', () => {
    expect(destaques.some((d) => d.category === 'salgada')).toBe(true);
    expect(destaques.some((d) => d.category === 'doce')).toBe(true);
  });
});

describe('faq', () => {
  it('não tem pergunta nem resposta vazia', () => {
    expect(faq.length).toBeGreaterThan(0);
    for (const item of faq) {
      expect(item.question.trim().length).toBeGreaterThan(0);
      expect(item.answer.trim().length, item.question).toBeGreaterThan(0);
      expect(item.question.trim(), item.question).toMatch(/\?$/u);
    }
  });

  it('não repete perguntas', () => {
    const questions = faq.map((f) => f.question);
    expect(new Set(questions).size).toBe(questions.length);
  });
});

describe('reviews', () => {
  it('só contém avaliações reais e completas do Google (ou nenhuma)', () => {
    for (const r of reviews) {
      expect(r.source).toBe('Google');
      expect(r.author.trim().length).toBeGreaterThan(0);
      expect(r.text.trim().length).toBeGreaterThan(0);
      expect([1, 2, 3, 4, 5]).toContain(r.rating);
      expect(Number.isNaN(Date.parse(r.date)), r.date).toBe(false);
    }
  });
});

describe('navegação', () => {
  it('usa caminhos internos com barra inicial e final', () => {
    for (const item of [...mainNav, ...footerNav]) {
      expect(item.path, item.label).toMatch(/^\/(?:[a-z0-9-]+\/)*$/);
      expect(item.label.trim().length).toBeGreaterThan(0);
    }
  });

  it('só aponta para rotas oficiais e não repete destinos', () => {
    for (const item of [...mainNav, ...footerNav]) expect(OFFICIAL_ROUTES, item.path).toContain(item.path);
    const paths = footerNav.map((i) => i.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});

describe('business', () => {
  it('tem WhatsApp coerente com o telefone em E.164', () => {
    expect(business.whatsappNumber).toMatch(/^\d{12,13}$/);
    expect(business.phone.e164).toBe(`+${business.whatsappNumber}`);
  });

  it('tem e-mail e perfis sociais válidos', () => {
    expect(business.email).toMatch(/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/u);
    expect(business.social.instagram).toMatch(/^https:\/\/www\.instagram\.com\/[^/]+\/$/);
    expect(business.social.facebook).toMatch(/^https:\/\/www\.facebook\.com\/[^/]+$/);
  });

  it('tem coordenadas dentro da cidade de São Paulo', () => {
    expect(business.geo.latitude).toBeGreaterThan(-24.1);
    expect(business.geo.latitude).toBeLessThan(-23.3);
    expect(business.geo.longitude).toBeGreaterThan(-46.9);
    expect(business.geo.longitude).toBeLessThan(-46.3);
  });

  it('tem horários válidos, sem dia repetido entre períodos', () => {
    const days = openingHours.flatMap((p) => p.days);
    expect(new Set(days).size).toBe(days.length);
    for (const p of openingHours) {
      expect(p.opens).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
      expect(p.closes).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
      expect(p.opens < p.closes, `${p.opens}–${p.closes}`).toBe(true);
    }
  });
});

describe('sem texto provisório nos dados', () => {
  const sources = {
    business: businessData,
    content: contentData,
    menu: menuData,
  };

  it.each(Object.entries(sources))('src/data/%s.ts', (name, mod) => {
    const strings = collectStrings(mod, name);
    expect(strings.length).toBeGreaterThan(0);
    const offenders = strings.filter(([, text]) => PLACEHOLDER_PATTERNS.some((re) => re.test(text)));
    expect(offenders.map(([path, text]) => `${path}: "${text}"`)).toEqual([]);
  });
});
