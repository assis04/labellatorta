/**
 * Infra dos testes do build: lê a pasta gerada pelo `astro build`, interpreta cada HTML e
 * oferece helpers de SEO, CSP, links e JSON-LD.
 *
 * Ambiente (os MESMOS valores usados no build):
 * - DIST_DIR ........ pasta do build (padrão "dist").
 * - BASE_PATH ....... subcaminho (padrão "/").
 * - SITE_INDEXABLE .. "false" em prévias (padrão "true").
 * - SITE_URL ........ origem pública (padrão igual ao astro.config.mjs).
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { HTMLElement, parse, TextNode, type Node } from 'node-html-parser';

/* ---------------------------------------------------------------- ambiente */

function normalizeBase(base: string): string {
  // No Git Bash (MSYS), "BASE_PATH=/repo/" vira "C:/Program Files/Git/repo/" ao chegar no Node.
  if (/^[A-Za-z]:|\\/u.test(base)) {
    throw new Error(
      `BASE_PATH inválido: "${base}". No Git Bash, rode com MSYS_NO_PATHCONV=1 (ex.: ` +
        'MSYS_NO_PATHCONV=1 BASE_PATH=/labellatorta/ npx vitest run tests/dist) — e use o mesmo ajuste no build.',
    );
  }
  const withLead = base.startsWith('/') ? base : `/${base}`;
  return withLead.endsWith('/') ? withLead : `${withLead}/`;
}

export const DIST_DIR = path.resolve(process.env['DIST_DIR'] || 'dist');
export const BASE_PATH = normalizeBase(process.env['BASE_PATH'] || '/');
export const SITE_URL = new URL(process.env['SITE_URL'] || 'https://www.labellatorta.com.br');
export const SITE_INDEXABLE = !['false', '0'].includes(
  (process.env['SITE_INDEXABLE'] ?? '').trim().toLowerCase(),
);
/** URL absoluta pública da home, ex.: https://www.labellatorta.com.br/labellatorta/ */
export const HOME_URL = new URL(BASE_PATH, SITE_URL).toString();
export const JS_BUDGET_BYTES = 20 * 1024;

if (!existsSync(DIST_DIR) || !statSync(DIST_DIR).isDirectory()) {
  throw new Error(
    `Pasta do build não encontrada: ${DIST_DIR}\n` +
      'Gere o build antes de rodar os testes do dist, com as mesmas variáveis de ambiente:\n' +
      '  npm run build && npm run test:dist\n' +
      'ou, numa pasta própria:\n' +
      '  ASTRO_CACHE_DIR=.agent-builds/<nome>/cache npx astro build --outDir .agent-builds/<nome>/dist\n' +
      '  DIST_DIR=.agent-builds/<nome>/dist npx vitest run tests/dist',
  );
}

/* ---------------------------------------------------------------- arquivos */

/** Caminhos relativos (com "/") de todos os arquivos do dist. */
function walk(dir: string, prefix = ''): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...walk(path.join(dir, entry.name), rel));
    else out.push(rel);
  }
  return out;
}

export const distFiles: readonly string[] = walk(DIST_DIR);
const distFileSet = new Set(distFiles);

export const distPath = (rel: string) => path.join(DIST_DIR, ...rel.split('/'));
export const hasDistFile = (rel: string) => distFileSet.has(rel);
export const readDist = (rel: string) => readFileSync(distPath(rel), 'utf8');

/* ---------------------------------------------------------------- páginas */

export interface Page {
  /** Arquivo relativo ao dist, ex.: "cardapio/index.html". */
  file: string;
  /** Rota sem o base path, ex.: "/cardapio/", "/" ou "/404.html". */
  route: string;
  /** Caminho público com o base path, ex.: "/labellatorta/cardapio/". */
  publicPath: string;
  html: string;
  root: HTMLElement;
  isRedirect: boolean;
  is404: boolean;
}

function routeOf(file: string): string {
  if (file === 'index.html') return '/';
  if (file.endsWith('/index.html')) return `/${file.slice(0, -'index.html'.length)}`;
  return `/${file}`;
}

export function parseHtml(html: string): HTMLElement {
  return parse(html, {
    comment: false,
    blockTextElements: { script: true, style: true, noscript: true, pre: true, textarea: true },
  });
}

export const pages: readonly Page[] = distFiles
  .filter((f) => f.endsWith('.html'))
  .sort()
  .map((file) => {
    const html = readDist(file);
    const root = parseHtml(html);
    const route = routeOf(file);
    const isRedirect = root
      .querySelectorAll('meta')
      .some((m) => m.getAttribute('http-equiv')?.toLowerCase() === 'refresh');
    return {
      file,
      route,
      publicPath: `${BASE_PATH}${route.slice(1)}`,
      html,
      root,
      isRedirect,
      is404: file === '404.html',
    };
  });

/** Páginas de conteúdo (exclui as de redirecionamento geradas pelo `redirects` do Astro). */
export const contentPages = pages.filter((p) => !p.isRedirect);
export const redirectPages = pages.filter((p) => p.isRedirect);
export const pageByFile = new Map(pages.map((p) => [p.file, p]));

/* ---------------------------------------------------------------- head / SEO */

export const tag = (el: HTMLElement) => (el.rawTagName ?? '').toLowerCase();

export function headOf(page: Page): HTMLElement {
  return page.root.querySelector('head') ?? page.root;
}

export function titleOf(page: Page): string | undefined {
  return headOf(page).querySelector('title')?.textContent.trim();
}

export function metaContent(page: Page, key: string): string | undefined {
  const k = key.toLowerCase();
  const meta = page.root
    .querySelectorAll('meta')
    .find((m) => (m.getAttribute('name') ?? m.getAttribute('property') ?? '').toLowerCase() === k);
  return meta?.getAttribute('content');
}

export function relTokens(el: HTMLElement): string[] {
  return (el.getAttribute('rel') ?? '').toLowerCase().split(/\s+/u).filter(Boolean);
}

export function canonicalOf(page: Page): string | undefined {
  return page.root
    .querySelectorAll('link')
    .find((l) => relTokens(l).includes('canonical'))
    ?.getAttribute('href');
}

export function robotsOf(page: Page): string | undefined {
  return metaContent(page, 'robots')?.toLowerCase();
}

export function isNoindex(page: Page): boolean {
  return /\bnoindex\b/u.test(robotsOf(page) ?? '');
}

/* ---------------------------------------------------------------- CSP */

export type Csp = Map<string, string[]>;

export function cspOf(page: Page): Csp | undefined {
  const metas = page.root
    .querySelectorAll('meta')
    .filter((m) => m.getAttribute('http-equiv')?.toLowerCase() === 'content-security-policy');
  if (metas.length === 0) return undefined;
  const csp: Csp = new Map();
  for (const meta of metas) {
    for (const directive of (meta.getAttribute('content') ?? '').split(';')) {
      const [name, ...values] = directive.trim().split(/\s+/u);
      if (name && !csp.has(name.toLowerCase())) csp.set(name.toLowerCase(), values);
    }
  }
  return csp;
}

/** A diretiva efetiva (cai para default-src, como o navegador faz). */
export function effectiveDirective(csp: Csp, name: string): string[] | undefined {
  return csp.get(name) ?? csp.get('default-src');
}

/** O navegador executaria/aplicaria esse conteúdo inline sob essa diretiva? */
export function inlineAllowed(sources: readonly string[], content: string): boolean {
  const hashes = sources.filter((s) => /^'sha(256|384|512)-/u.test(s));
  const hasNonceOrHash = hashes.length > 0 || sources.some((s) => s.startsWith("'nonce-"));
  // Com hash ou nonce presentes, 'unsafe-inline' é ignorado pelo navegador (CSP nível 2+).
  if (!hasNonceOrHash && sources.includes("'unsafe-inline'")) return true;
  return hashes.some((h) => {
    const [, algo] = /^'sha(256|384|512)-/u.exec(h) ?? [];
    const digest = createHash(`sha${algo}`).update(content, 'utf8').digest('base64');
    return h === `'sha${algo}-${digest}'`;
  });
}

/* ---------------------------------------------------------------- JSON-LD */

export function jsonLdBlocks(page: Page): { raw: string; data?: unknown; error?: string }[] {
  return page.root
    .querySelectorAll('script')
    .filter((s) => s.getAttribute('type')?.toLowerCase() === 'application/ld+json')
    .map((s) => {
      const raw = s.rawText;
      try {
        return { raw, data: JSON.parse(raw) as unknown };
      } catch (e) {
        return { raw, error: (e as Error).message };
      }
    });
}

/** Todos os nós com `@type` (inclui aninhados e @graph). */
export function jsonLdNodes(page: Page): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const visit = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(visit);
    else if (v && typeof v === 'object') {
      const obj = v as Record<string, unknown>;
      if ('@type' in obj) out.push(obj);
      Object.values(obj).forEach(visit);
    }
  };
  for (const block of jsonLdBlocks(page)) visit(block.data);
  return out;
}

export function typesOf(node: Record<string, unknown>): string[] {
  const t = node['@type'];
  return (Array.isArray(t) ? t : [t]).filter((x): x is string => typeof x === 'string');
}

export function jsonLdTypes(page: Page): Set<string> {
  return new Set(jsonLdNodes(page).flatMap(typesOf));
}

/* ---------------------------------------------------------------- texto visível */

const NON_VISIBLE = new Set(['script', 'style', 'noscript', 'template']);
const TEXT_ATTRIBUTES = ['alt', 'title', 'aria-label', 'placeholder'];

/** Texto que o visitante (ou o Google) lê: nós de texto do body + alt/title/aria-label + title/description. */
export function visibleText(page: Page): string {
  const parts: string[] = [titleOf(page) ?? '', metaContent(page, 'description') ?? ''];
  const visit = (node: Node) => {
    if (node instanceof TextNode) {
      parts.push(node.text);
    } else if (node instanceof HTMLElement) {
      if (NON_VISIBLE.has(tag(node))) return;
      for (const attr of TEXT_ATTRIBUTES) {
        const value = node.getAttribute(attr);
        if (value) parts.push(value);
      }
      node.childNodes.forEach(visit);
    }
  };
  visit(page.root.querySelector('body') ?? page.root);
  return parts.join(' ').replace(/\s+/gu, ' ');
}

/* ---------------------------------------------------------------- links */

export type Resolution =
  { kind: 'skip' } | { kind: 'ok'; file: string; fragment: string } | { kind: 'error'; reason: string };

/** Arquivo do dist correspondente a um caminho público (já sem query/hash). */
export function fileForPublicPath(pathname: string): Resolution {
  if (!pathname.startsWith(BASE_PATH)) {
    return { kind: 'error', reason: `não começa com o base path "${BASE_PATH}"` };
  }
  let rest: string;
  try {
    rest = decodeURIComponent(pathname.slice(BASE_PATH.length));
  } catch {
    return { kind: 'error', reason: 'codificação de URL inválida' };
  }
  if (rest === '' || rest.endsWith('/')) {
    const file = `${rest}index.html`;
    return hasDistFile(file)
      ? { kind: 'ok', file, fragment: '' }
      : { kind: 'error', reason: `${file} não existe` };
  }
  if (hasDistFile(rest)) return { kind: 'ok', file: rest, fragment: '' };
  if (hasDistFile(`${rest}/index.html`)) return { kind: 'error', reason: 'falta a barra final' };
  return { kind: 'error', reason: `${rest} não existe` };
}

/**
 * Resolve uma referência encontrada numa página (href/src). Externas, mailto, tel e data: são ignoradas.
 * URLs absolutas do próprio site (SITE_URL) também são verificadas.
 */
export function resolveRef(ref: string, page: Page): Resolution {
  const value = ref.trim();
  if (value === '') return { kind: 'error', reason: 'href/src vazio' };
  if (/^javascript:/iu.test(value)) return { kind: 'error', reason: 'URL javascript: (bloqueada pela CSP)' };
  if (/^(mailto:|tel:|sms:|data:|blob:)/iu.test(value)) return { kind: 'skip' };
  if (value.startsWith('//')) return { kind: 'skip' };

  const pageUrl = new URL(page.publicPath, SITE_URL);
  let url: URL;
  try {
    url = new URL(value, pageUrl);
  } catch {
    return { kind: 'error', reason: 'URL inválida' };
  }
  if (url.origin !== SITE_URL.origin) return { kind: 'skip' };

  const fragment = decodeURIComponent(url.hash.slice(1));
  // Âncora na própria página: "#conteudo".
  if (value.startsWith('#')) return { kind: 'ok', file: page.file, fragment };

  const resolved = fileForPublicPath(url.pathname);
  return resolved.kind === 'ok' ? { ...resolved, fragment } : resolved;
}

/** O alvo de uma âncora existe na página (`#` e `#top` levam ao topo, pela especificação HTML). */
export function fragmentExists(file: string, fragment: string): boolean {
  if (fragment === '' || fragment.toLowerCase() === 'top') return true;
  const target = pageByFile.get(file);
  if (!target) return true; // não é HTML (ex.: PDF): nada a verificar
  return target.root.querySelectorAll('[id], a[name]').some((el) => {
    return el.getAttribute('id') === fragment || (tag(el) === 'a' && el.getAttribute('name') === fragment);
  });
}

/* ---------------------------------------------------------------- JavaScript */

const STATIC_IMPORT = /\bfrom\s*["']([^"']+)["']|\bimport\s*["']([^"']+)["']/gu;

/**
 * Bytes de JavaScript que a página carrega na abertura: módulos externos, módulos inline e
 * todos os imports estáticos deles (cada arquivo contado uma vez). `import()` dinâmico fica de fora.
 */
export function moduleScriptBytes(page: Page): { total: number; files: string[]; errors: string[] } {
  const seen = new Set<string>();
  const errors: string[] = [];
  let total = 0;

  const visitCode = (code: string, fromUrl: URL) => {
    for (const m of code.matchAll(STATIC_IMPORT)) {
      const spec = m[1] ?? m[2];
      if (!spec || !/^(\.{1,2}\/|\/)/u.test(spec)) continue;
      visitFile(new URL(spec, fromUrl));
    }
  };
  const visitFile = (url: URL) => {
    if (url.origin !== SITE_URL.origin) return; // externo: não é do nosso orçamento
    const r = fileForPublicPath(url.pathname);
    if (r.kind !== 'ok') {
      errors.push(`${url.pathname}: ${r.kind === 'error' ? r.reason : ''}`);
      return;
    }
    if (seen.has(r.file)) return;
    seen.add(r.file);
    const code = readDist(r.file);
    total += Buffer.byteLength(code, 'utf8');
    visitCode(code, url);
  };

  const pageUrl = new URL(page.publicPath, SITE_URL);
  for (const script of page.root.querySelectorAll('script')) {
    if (script.getAttribute('type')?.toLowerCase() !== 'module') continue;
    const src = script.getAttribute('src');
    if (src) {
      visitFile(new URL(src, pageUrl));
    } else {
      total += Buffer.byteLength(script.rawText, 'utf8');
      visitCode(script.rawText, pageUrl);
    }
  }
  return { total, files: [...seen], errors };
}

/** Scripts que o navegador executa (exclui JSON-LD e outros blocos de dados). */
export function isExecutableScript(script: HTMLElement): boolean {
  const type = (script.getAttribute('type') ?? '').trim().toLowerCase();
  return ['', 'module', 'text/javascript', 'application/javascript'].includes(type);
}

/* ---------------------------------------------------------------- utilidades */

/** Valores de <loc> de um sitemap XML. */
export function sitemapLocs(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gu)].map((m) => (m[1] ?? '').replace(/&amp;/gu, '&'));
}
