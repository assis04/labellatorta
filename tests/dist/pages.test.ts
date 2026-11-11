/**
 * Checagens por página do build: SEO, CSP, acessibilidade básica, links, JSON-LD e orçamento de JS.
 * Rodam contra o HTML final (o que o GitHub Pages serve), não contra os templates.
 */
import { describe, expect, it } from 'vitest';
import { findPlaceholders } from '../placeholders';
import {
  canonicalOf,
  contentPages,
  cspOf,
  effectiveDirective,
  fragmentExists,
  inlineAllowed,
  isExecutableScript,
  JS_BUDGET_BYTES,
  jsonLdBlocks,
  jsonLdTypes,
  metaContent,
  moduleScriptBytes,
  pageByFile,
  relTokens,
  resolveRef,
  robotsOf,
  SITE_INDEXABLE,
  SITE_URL,
  tag,
  titleOf,
  visibleText,
  type Page,
} from './lib';

const TITLE_MAX = 65;
const DESCRIPTION_MIN = 70;
const DESCRIPTION_MAX = 170;

/** Páginas que compartilham o mesmo valor (para as regras de unicidade). */
function groupBy(fn: (p: Page) => string | undefined): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const p of contentPages) {
    const key = fn(p);
    if (key) map.set(key, [...(map.get(key) ?? []), p.route]);
  }
  return map;
}
const byTitle = groupBy(titleOf);
const byDescription = groupBy((p) => metaContent(p, 'description')?.trim());

/** Referências a recursos do próprio site (CSS, JS, fontes, imagens, ícones, manifest). */
function resourceRefs(page: Page): string[] {
  const refs: string[] = [];
  for (const el of page.root.querySelectorAll('link[href]')) {
    const rel = relTokens(el);
    if (rel.includes('canonical') || rel.includes('alternate')) continue;
    refs.push(el.getAttribute('href') ?? '');
  }
  for (const el of page.root.querySelectorAll('script[src], img[src], source[src], video[src], audio[src]')) {
    refs.push(el.getAttribute('src') ?? '');
  }
  for (const el of page.root.querySelectorAll('img[srcset], source[srcset]')) {
    for (const candidate of (el.getAttribute('srcset') ?? '').split(',')) {
      const url = candidate.trim().split(/\s+/u)[0];
      if (url) refs.push(url);
    }
  }
  for (const el of page.root.querySelectorAll('video[poster]')) refs.push(el.getAttribute('poster') ?? '');
  for (const key of ['og:image', 'twitter:image']) {
    const value = metaContent(page, key);
    if (value) refs.push(value);
  }
  return refs;
}

describe.each(contentPages.map((p) => [p.route, p] as const))('%s', (_route, page) => {
  /* ------------------------------------------------------------ SEO */

  it('declara lang="pt-BR"', () => {
    expect(page.root.querySelector('html')?.getAttribute('lang')).toBe('pt-BR');
  });

  it('tem exatamente um <h1>', () => {
    const h1s = page.root.querySelectorAll('h1').map((h) => h.textContent.trim());
    expect(h1s, `h1 encontrados: ${JSON.stringify(h1s)}`).toHaveLength(1);
    expect(h1s[0]?.length, 'h1 vazio').toBeGreaterThan(0);
  });

  it(`tem <title> de até ${TITLE_MAX} caracteres, único no site`, () => {
    const title = titleOf(page);
    expect(title, '<title> ausente').toBeTruthy();
    expect(title?.length, `"${title}"`).toBeLessThanOrEqual(TITLE_MAX);
    expect(byTitle.get(title ?? ''), `title repetido: "${title}"`).toEqual([page.route]);
  });

  it(`tem meta description de ${DESCRIPTION_MIN} a ${DESCRIPTION_MAX} caracteres, única no site`, () => {
    const description = metaContent(page, 'description')?.trim();
    expect(description, 'meta description ausente').toBeTruthy();
    const length = description?.length ?? 0;
    expect(length, `${length} caracteres: "${description}"`).toBeGreaterThanOrEqual(DESCRIPTION_MIN);
    expect(length, `${length} caracteres: "${description}"`).toBeLessThanOrEqual(DESCRIPTION_MAX);
    expect(byDescription.get(description ?? ''), `description repetida: "${description}"`).toEqual([
      page.route,
    ]);
  });

  it('tem canonical absoluto no domínio do site, com barra final', () => {
    const canonical = canonicalOf(page);
    expect(canonical, 'link rel=canonical ausente').toBeTruthy();
    const url = new URL(canonical ?? '', 'invalid://relative/');
    const self = new URL(page.publicPath, SITE_URL).toString();
    expect(url.origin, `canonical não é absoluto no site: ${canonical}`).toBe(SITE_URL.origin);
    expect(url.search + url.hash, canonical).toBe('');
    if (page.is404) {
      // A 404 é servida em qualquer URL inexistente: vale barra final ou o próprio arquivo (…/404.html),
      // que existe e não redireciona — a razão da regra da barra final.
      if (canonical !== self) expect(url.pathname, canonical).toMatch(/\/$/u);
    } else {
      expect(url.pathname, canonical).toMatch(/\/$/u);
      expect(canonical, 'canonical deve apontar para a própria página').toBe(self);
    }
  });

  it(`tem meta robots coerente com SITE_INDEXABLE=${String(SITE_INDEXABLE)}${page.is404 ? ' (404: sempre noindex)' : ''}`, () => {
    const robots = robotsOf(page);
    expect(robots, 'meta robots ausente').toBeTruthy();
    if (page.is404 || !SITE_INDEXABLE) {
      expect(robots).toMatch(/\bnoindex\b/u);
    } else {
      expect(robots).not.toMatch(/\bnoindex\b|\bnofollow\b|\bnone\b/u);
      expect(robots).toMatch(/\bindex\b/u);
    }
  });

  /* ------------------------------------------------------------ segurança */

  it("tem CSP em meta e script-src sem 'unsafe-inline' nem 'unsafe-eval'", () => {
    const csp = cspOf(page);
    expect(csp, 'meta http-equiv="content-security-policy" ausente').toBeDefined();
    if (!csp) return;
    const meta = page.root
      .querySelectorAll('meta')
      .find((m) => m.getAttribute('http-equiv')?.toLowerCase() === 'content-security-policy');
    expect(meta?.closest('head'), 'a meta CSP precisa estar no <head>').toBeTruthy();
    const scriptSrc = effectiveDirective(csp, 'script-src');
    expect(scriptSrc, 'sem script-src nem default-src').toBeDefined();
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
    expect(csp.get('object-src')).toEqual(["'none'"]);
  });

  it('só tem script/style inline autorizados pela CSP (hash)', () => {
    const csp = cspOf(page);
    if (!csp) return; // coberto pelo teste anterior
    const issues: string[] = [];
    for (const script of page.root.querySelectorAll('script')) {
      if (script.getAttribute('src') || !isExecutableScript(script)) continue;
      if (!inlineAllowed(effectiveDirective(csp, 'script-src') ?? [], script.rawText)) {
        issues.push(`<script> inline sem hash na CSP: ${script.rawText.slice(0, 80)}…`);
      }
    }
    for (const style of page.root.querySelectorAll('style')) {
      if (!inlineAllowed(effectiveDirective(csp, 'style-src') ?? [], style.rawText)) {
        issues.push(`<style> inline sem hash na CSP: ${style.rawText.slice(0, 80)}…`);
      }
    }
    expect([...new Set(issues)]).toEqual([]);
  });

  it('não usa atributo style= nem handlers on*= (bloqueados pela CSP)', () => {
    const issues: string[] = [];
    for (const el of page.root.querySelectorAll('*')) {
      for (const name of Object.keys(el.rawAttributes)) {
        const attr = name.toLowerCase();
        // "open" (<details open>, <dialog open>) não é handler de evento.
        if (attr === 'style' || (/^on[a-z]+$/u.test(attr) && attr !== 'open')) {
          issues.push(`<${tag(el)} ${name}="${el.getAttribute(name) ?? ''}">`);
        }
      }
    }
    expect([...new Set(issues)]).toEqual([]);
  });

  it('links com target="_blank" têm rel="noopener"', () => {
    const issues = page.root
      .querySelectorAll('a[target], area[target], form[target]')
      .filter((el) => el.getAttribute('target')?.toLowerCase() === '_blank')
      // noreferrer implica noopener pela especificação HTML.
      .filter((el) => !relTokens(el).some((r) => r === 'noopener' || r === 'noreferrer'))
      .map((el) => `${el.getAttribute('href') ?? ''} (rel="${el.getAttribute('rel') ?? ''}")`);
    expect([...new Set(issues)]).toEqual([]);
  });

  /* ------------------------------------------------------------ acessibilidade */

  it('toda <img> tem alt, width e height', () => {
    const issues: string[] = [];
    for (const img of page.root.querySelectorAll('img')) {
      const src = img.getAttribute('src') ?? '(sem src)';
      if (!img.hasAttribute('alt')) issues.push(`${src}: sem alt`);
      for (const dim of ['width', 'height']) {
        const value = img.getAttribute(dim);
        if (!value || !/^\d+$/u.test(value) || Number(value) <= 0)
          issues.push(`${src}: ${dim}="${value ?? ''}"`);
      }
    }
    expect([...new Set(issues)]).toEqual([]);
  });

  /* ------------------------------------------------------------ dados estruturados */

  it('tem JSON-LD válido com o Restaurant', () => {
    const blocks = jsonLdBlocks(page);
    expect(blocks.length, 'nenhum <script type="application/ld+json">').toBeGreaterThan(0);
    expect(blocks.filter((b) => b.error).map((b) => `${b.error}: ${b.raw.slice(0, 80)}`)).toEqual([]);
    expect([...jsonLdTypes(page)]).toContain('Restaurant');
  });

  /* ------------------------------------------------------------ links */

  it('links internos apontam para páginas existentes do build (com base path e barra final)', () => {
    const issues: string[] = [];
    for (const a of page.root.querySelectorAll('a[href], area[href]')) {
      const ref = a.getAttribute('href') ?? '';
      const r = resolveRef(ref, page);
      if (r.kind === 'error') issues.push(`${ref}: ${r.reason}`);
      if (r.kind !== 'ok') continue;
      if (!fragmentExists(r.file, r.fragment))
        issues.push(`${ref}: âncora #${r.fragment} não existe em ${r.file}`);
      if (pageByFile.get(r.file)?.isRedirect)
        issues.push(`${ref}: aponta para uma página de redirecionamento`);
    }
    expect([...new Set(issues)]).toEqual([]);
  });

  it('recursos internos (CSS, JS, fontes, imagens, ícones, manifest) existem no build', () => {
    const issues: string[] = [];
    for (const ref of resourceRefs(page)) {
      const r = resolveRef(ref, page);
      if (r.kind === 'error') issues.push(`${ref}: ${r.reason}`);
    }
    expect([...new Set(issues)]).toEqual([]);
  });

  /* ------------------------------------------------------------ conteúdo */

  it('não tem texto provisório (validar, TODO, lorem, R$ —, x,x)', () => {
    expect(findPlaceholders(visibleText(page))).toEqual([]);
  });

  /* ------------------------------------------------------------ performance */

  it(`carrega no máximo ${JS_BUDGET_BYTES / 1024} KB de JavaScript`, () => {
    const { total, files, errors } = moduleScriptBytes(page);
    expect(errors, 'script de módulo que não existe no build').toEqual([]);
    expect(total, `${(total / 1024).toFixed(1)} KB em ${files.join(', ')}`).toBeLessThanOrEqual(
      JS_BUDGET_BYTES,
    );
  });
});
