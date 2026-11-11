/**
 * Checagens do site como um todo: rotas esperadas, redirecionamentos, sitemap, robots.txt,
 * llms.txt e o tipo de dado estruturado que cada página precisa ter.
 */
import { describe, expect, it } from 'vitest';
import { faq } from '../../src/data/content';
import { tortas } from '../../src/data/menu';
import { findPlaceholders } from '../placeholders';
import {
  BASE_PATH,
  contentPages,
  fileForPublicPath,
  hasDistFile,
  HOME_URL,
  isNoindex,
  jsonLdNodes,
  jsonLdTypes,
  pageByFile,
  readDist,
  redirectPages,
  resolveRef,
  SITE_INDEXABLE,
  SITE_URL,
  sitemapLocs,
  typesOf,
  visibleText,
  type Page,
} from './lib';

const tortaRoutes = tortas.map((t) => `/tortas/${t.slug}/`);
const EXPECTED_ROUTES = [
  '/',
  '/cardapio/',
  ...tortaRoutes,
  '/almoco/',
  '/encomendas/',
  '/sobre/',
  '/contato/',
  '/perguntas-frequentes/',
  '/politica-de-privacidade/',
  '/404.html',
];

const fileOfRoute = (route: string) => (route.endsWith('/') ? `${route.slice(1)}index.html` : route.slice(1));
const pageOf = (route: string): Page | undefined => pageByFile.get(fileOfRoute(route));
const contentPage = (route: string): Page | undefined => {
  const p = pageOf(route);
  return p && !p.isRedirect ? p : undefined;
};

/** Caminho público → arquivo do dist, a partir de uma URL absoluta do site. */
function fileOfAbsolute(url: string): string | undefined {
  const u = new URL(url);
  if (u.origin !== SITE_URL.origin) return undefined;
  const r = fileForPublicPath(u.pathname);
  return r.kind === 'ok' ? r.file : undefined;
}

/* ------------------------------------------------------------------ rotas */

describe('rotas esperadas', () => {
  it.each(EXPECTED_ROUTES)('%s existe como página de conteúdo', (route) => {
    const file = fileOfRoute(route);
    expect(hasDistFile(file), `${file} não existe no build`).toBe(true);
    expect(pageOf(route)?.isRedirect, `${file} é uma página de redirecionamento`).toBe(false);
  });

  it('não há páginas fora das rotas oficiais (sobras de teste, rascunhos)', () => {
    const unexpected = contentPages.map((p) => p.route).filter((r) => !EXPECTED_ROUTES.includes(r));
    expect(unexpected).toEqual([]);
  });
});

describe('páginas de redirecionamento (URLs do site antigo)', () => {
  it.each(redirectPages.map((p) => [p.route, p] as const))(
    '%s é noindex e leva a uma página existente',
    (_r, page) => {
      expect(isNoindex(page), 'redirecionamento sem noindex').toBe(true);
      const refresh = page.root
        .querySelectorAll('meta')
        .find((m) => m.getAttribute('http-equiv')?.toLowerCase() === 'refresh')
        ?.getAttribute('content');
      const target = /url=(.+)$/iu
        .exec(refresh ?? '')?.[1]
        ?.trim()
        .replace(/^['"]|['"]$/gu, '');
      expect(target, `meta refresh sem url: "${refresh}"`).toBeTruthy();
      const r = resolveRef(target ?? '', page);
      expect(r.kind === 'error' ? `${target}: ${r.reason}` : 'ok').toBe('ok');
      if (r.kind === 'ok')
        expect(pageByFile.get(r.file)?.isRedirect, `${target} redireciona de novo`).toBe(false);
    },
  );
});

/* ------------------------------------------------------------------ dados estruturados por tipo de página */

describe('dados estruturados por página', () => {
  it('home tem Restaurant e WebSite', () => {
    const page = contentPage('/');
    expect(page, 'home não existe').toBeDefined();
    if (!page) return;
    expect([...jsonLdTypes(page)]).toEqual(expect.arrayContaining(['Restaurant', 'WebSite']));
  });

  it('cardápio tem Menu com todas as tortas', () => {
    const page = contentPage('/cardapio/');
    expect(page, '/cardapio/ não existe').toBeDefined();
    if (!page) return;
    expect([...jsonLdTypes(page)]).toContain('Menu');
    const names = jsonLdNodes(page)
      .filter((n) => typesOf(n).includes('MenuItem'))
      .map((n) => n['name']);
    expect(names).toEqual(expect.arrayContaining(tortas.map((t) => t.name)));
  });

  it.each(tortas.map((t) => [t.slug, t] as const))('/tortas/%s/ tem MenuItem do sabor', (_slug, torta) => {
    const page = contentPage(`/tortas/${torta.slug}/`);
    expect(page, `/tortas/${torta.slug}/ não existe`).toBeDefined();
    if (!page) return;
    const items = jsonLdNodes(page).filter((n) => typesOf(n).includes('MenuItem'));
    expect(
      items.map((n) => n['name']),
      'MenuItem ausente ou de outro sabor',
    ).toContain(torta.name);
  });

  it('perguntas frequentes tem FAQPage com as perguntas visíveis na página', () => {
    const page = contentPage('/perguntas-frequentes/');
    expect(page, '/perguntas-frequentes/ não existe').toBeDefined();
    if (!page) return;
    const faqPage = jsonLdNodes(page).find((n) => typesOf(n).includes('FAQPage'));
    expect(faqPage, 'FAQPage ausente').toBeDefined();
    const questions = ((faqPage?.['mainEntity'] as Record<string, unknown>[] | undefined) ?? []).map((q) =>
      String(q['name']),
    );
    expect(questions).toEqual(expect.arrayContaining(faq.map((f) => f.question)));
    // O Google exige que o conteúdo do FAQPage esteja visível para o usuário.
    const text = visibleText(page);
    expect(questions.filter((q) => !text.includes(q))).toEqual([]);
  });

  const internal = contentPages.filter((p) => p.route !== '/' && !p.is404);
  it.each(internal.map((p) => [p.route, p] as const))('%s tem BreadcrumbList válido', (_r, page) => {
    const list = jsonLdNodes(page).find((n) => typesOf(n).includes('BreadcrumbList'));
    expect(list, 'BreadcrumbList ausente').toBeDefined();
    const elements = (list?.['itemListElement'] as Record<string, unknown>[] | undefined) ?? [];
    expect(elements.length).toBeGreaterThanOrEqual(2);
    expect(elements.map((e) => e['position'])).toEqual(elements.map((_, i) => i + 1));
    for (const e of elements) {
      const item =
        typeof e['item'] === 'string' ? e['item'] : String((e['item'] as { '@id'?: string })?.['@id']);
      expect(String(e['name'] ?? '').trim().length, `item sem nome: ${item}`).toBeGreaterThan(0);
      const file = fileOfAbsolute(item);
      expect(file, `item da trilha não existe no build: ${item}`).toBeDefined();
      expect(pageByFile.get(file ?? '')?.isRedirect, `item da trilha é redirecionamento: ${item}`).toBe(
        false,
      );
    }
    expect(elements.at(-1)?.['item'], 'o último item da trilha deve ser a própria página').toBe(
      new URL(page.publicPath, SITE_URL).toString(),
    );
  });
});

/* ------------------------------------------------------------------ sitemap */

describe('sitemap', () => {
  const indexFile = 'sitemap-index.xml';
  const indexXml = hasDistFile(indexFile) ? readDist(indexFile) : '';
  const sitemapUrls = sitemapLocs(indexXml);
  const sitemapFiles = sitemapUrls.map(fileOfAbsolute);
  const locs = sitemapFiles.flatMap((f) => (f && hasDistFile(f) ? sitemapLocs(readDist(f)) : []));

  it('sitemap-index.xml existe e aponta para sitemaps do build', () => {
    expect(hasDistFile(indexFile), `${indexFile} não existe`).toBe(true);
    expect(sitemapUrls.length).toBeGreaterThan(0);
    expect(sitemapUrls).toContain(`${HOME_URL}sitemap-0.xml`);
    expect(sitemapUrls.filter((_, i) => !sitemapFiles[i])).toEqual([]);
  });

  it('só lista URLs absolutas do site, com base path e barra final, sem repetição', () => {
    const bad = locs.filter((loc) => !loc.startsWith(HOME_URL) || !new URL(loc).pathname.endsWith('/'));
    expect(bad).toEqual([]);
    expect(new Set(locs).size).toBe(locs.length);
  });

  it('não lista 404, redirecionamentos nem URLs inexistentes', () => {
    const bad = locs.filter((loc) => {
      const file = fileOfAbsolute(loc);
      const page = file ? pageByFile.get(file) : undefined;
      return !page || page.isRedirect || page.is404;
    });
    expect(bad).toEqual([]);
  });

  it('lista todas as páginas indexáveis', () => {
    const indexable = contentPages.filter((p) => !p.is404 && !isNoindex(p));
    if (SITE_INDEXABLE) expect(indexable.length, 'nenhuma página indexável no build').toBeGreaterThan(0);
    const expected = indexable.map((p) => new URL(p.publicPath, SITE_URL).toString());
    expect(expected.filter((url) => !locs.includes(url))).toEqual([]);
  });

  it.runIf(SITE_INDEXABLE)('não lista páginas marcadas como noindex', () => {
    const noindex = locs.filter((loc) => {
      const page = pageByFile.get(fileOfAbsolute(loc) ?? '');
      return page !== undefined && isNoindex(page);
    });
    expect(noindex).toEqual([]);
  });
});

/* ------------------------------------------------------------------ robots.txt */

interface RobotsGroup {
  agents: string[];
  rules: { type: 'allow' | 'disallow'; path: string }[];
}

/** Parser mínimo de robots.txt (RFC 9309): grupos de user-agent e linhas Sitemap. */
function parseRobots(text: string): { groups: RobotsGroup[]; sitemaps: string[] } {
  const groups: RobotsGroup[] = [];
  const sitemaps: string[] = [];
  let current: RobotsGroup | undefined;
  let lastWasAgent = false;
  for (const rawLine of text.split(/\r?\n/u)) {
    const line = rawLine.replace(/#.*/u, '').trim();
    const match = /^([A-Za-z-]+)\s*:\s*(.*)$/u.exec(line);
    if (!match) continue;
    const key = (match[1] ?? '').toLowerCase();
    const value = (match[2] ?? '').trim();
    if (key === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if ((key === 'allow' || key === 'disallow') && current) {
      current.rules.push({ type: key, path: value });
      lastWasAgent = false;
    } else if (key === 'sitemap') {
      sitemaps.push(value);
    }
  }
  return { groups, sitemaps };
}

describe('robots.txt', () => {
  const exists = hasDistFile('robots.txt');
  const robots = parseRobots(exists ? readDist('robots.txt') : '');
  const star = robots.groups.find((g) => g.agents.includes('*'));
  const blocksAll = (g: RobotsGroup) => g.rules.some((r) => r.type === 'disallow' && r.path === '/');

  it('existe e tem um grupo para todos os rastreadores (User-agent: *)', () => {
    expect(exists, 'robots.txt não existe no build').toBe(true);
    expect(star, 'sem grupo "User-agent: *"').toBeDefined();
  });

  it.runIf(SITE_INDEXABLE)('em produção, não bloqueia nada e aponta o sitemap', () => {
    expect(robots.groups.filter(blocksAll).map((g) => g.agents.join(', '))).toEqual([]);
    expect(robots.sitemaps).toEqual([`${HOME_URL}sitemap-index.xml`]);
    expect(hasDistFile('sitemap-index.xml')).toBe(true);
  });

  it.runIf(!SITE_INDEXABLE)('em prévia, bloqueia todos os rastreadores e não anuncia sitemap', () => {
    expect(star && blocksAll(star), 'falta "Disallow: /" no grupo "*"').toBe(true);
    const allowsSomeone = robots.groups.filter((g) =>
      g.rules.some((r) => r.type === 'allow' && r.path === '/'),
    );
    expect(allowsSomeone.map((g) => g.agents.join(', '))).toEqual([]);
    expect(robots.sitemaps).toEqual([]);
  });
});

/* ------------------------------------------------------------------ llms.txt */

describe('llms.txt', () => {
  const exists = hasDistFile('llms.txt');
  const text = exists ? readDist('llms.txt') : '';

  it('existe e começa com o nome da casa (formato llmstxt.org)', () => {
    expect(exists, 'llms.txt não existe no build').toBe(true);
    expect(text).toMatch(/^# La Bella Torta\s*$/mu);
  });

  it('cita todos os sabores de torta', () => {
    const lower = text.toLowerCase();
    expect(tortas.map((t) => t.name).filter((name) => !lower.includes(name.toLowerCase()))).toEqual([]);
  });

  it('só tem links do site que existem no build (com base path)', () => {
    const urls = [...text.matchAll(/https?:\/\/[^\s)<>\]]+/gu)].map((m) => m[0]);
    const own = urls.filter((u) => new URL(u).origin === SITE_URL.origin);
    expect(own.length, 'nenhum link para o próprio site').toBeGreaterThan(0);
    const broken = own.filter((u) => {
      const file = fileOfAbsolute(u);
      return !file || pageByFile.get(file)?.isRedirect;
    });
    expect(broken).toEqual([]);
    expect(own.filter((u) => !new URL(u).pathname.startsWith(BASE_PATH))).toEqual([]);
  });

  it('não tem texto provisório', () => {
    expect(findPlaceholders(text)).toEqual([]);
  });
});
