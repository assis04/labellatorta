// @ts-check
import { defineConfig, envField } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/**
 * Configuração por ambiente (ver .env.example e ARCHITECTURE.md):
 * - SITE_URL ........ origem pública: canonical, sitemap e Open Graph.
 * - BASE_PATH ....... subcaminho quando publicado em <usuario>.github.io/<repo>/.
 * - SITE_INDEXABLE .. "false" em prévias, para não competir no Google com o domínio oficial.
 * - PLAUSIBLE_DOMAIN  liga o analytics sem cookies (e libera o domínio dele na CSP).
 * - ASTRO_CACHE_DIR . cache isolado para builds paralelos (CI e agentes).
 */
const SITE_URL = process.env.SITE_URL || 'https://www.labellatorta.com.br';
const BASE_PATH = process.env.BASE_PATH || '/';
const ANALYTICS_ORIGIN = process.env.PLAUSIBLE_DOMAIN ? 'https://plausible.io' : '';

/**
 * URLs do site antigo (SITE123), levantadas do sitemap.xml publicado em www.labellatorta.com.br
 * (10/11/2026). O GitHub Pages não faz redirecionamento HTTP: para cada origem o Astro gera uma
 * página estática com meta refresh imediato, `canonical` para o destino e `noindex` — o Google
 * trata como redirecionamento permanente. O Astro NÃO aplica o `base` ao destino de um
 * redirecionamento, por isso todo destino passa por `to()`.
 * As fotos avulsas das duas galerias antigas (/galeria/item-id-…, /galeria-1/item-id-…) vão para
 * a home; em build estático não existe rota curinga com destino fixo, então a lista é explícita.
 */
const SITE123_GALLERY_ITEMS = {
  galeria: `
    6a073eac02e5a 6a073ea6b9298 6a073ea88ccc1 6a073ea5903aa 6a073eaac6756 6a073eaad0b76 6a073ea43ae47
    6a073ea866d89 6a073ea3d2b9f 6a073ea266c25 6a073ea363601 6a073ea3f07cc 6a073ea67e6c2 6a073ea6c040b
    6a073ea472cba 6a073ea3d1c8e 6a073ea422155 6a073ea425d9a 5d9b3e9cdc1f2 5d9b3e9ce50f6 5d9b3e9d28c06
    5d9b3e9d378ca 5d9b3e9d89cf1 5d9b3e9e4212c 5d9b3e9e43a91 5d9b3e9e6900c 5d9b3e9ece83d 5d9b3e9ee82cc
    5d9b3e9fbe77d 5d9b3ea0379cf 5d9b3ea04b465 5d9b3ea0553a5 5d9b3ea07810e 5d9b3ea07877a 5d9b3e9cdc1e8
    5d9b3ea083227 5d9b3ea117f64 5d9b3ea15cb39 5d9b3ea1838c4 6a073ea574bb7 5da865321f2d5 6a073ea53c0e5
    6a073ea6a6a55 6a073ea872298 6a073ea86e952 6a073ea9489d4 6a073eaa4b412 6a073ea928b41 6a073ea8243e3
    6a073ea81cd39 6a073ea99c7e6 6a07413bdfae1`,
  'galeria-1': `
    6a074a57cb0bf 6a074a57b2fc4 6a074a57bf543 6a074a57ae438 6a074a57c82d5 6a074a57c9b32 6a074a57a8906
    6a074a57ba5b7 6a074a57a2dda 6a074a579e997 6a074a57a00ba 6a074a57a43c4 6a074a57afd1d 6a074a57b4dbf
    6a074a57a9e5b 6a074a57a18a3 6a074a57a5b66 6a074a57a72c5 6a074a577f5cc 6a074a5780bc9 6a074a5782128
    6a074a57837c6 6a074a5784fb2 6a074a57868ec 6a074a5787f8c 6a074a5789647 6a074a578b586 6a074a578cd29
    6a074a578e662 6a074a579051a 6a074a5792129 6a074a5793768 6a074a5794ccc 6a074a579621d 6a074a577deda
    6a074a579787f 6a074a5798ea2 6a074a579a6a2 6a074a579be0a 6a074a57acddc 6a074a579d3a5 6a074a57ab876
    6a074a57b1738 6a074a57bd90e 6a074a57bc06d 6a074a57c2d6c 6a074a57c68be 6a074a57c0f9b 6a074a57b87a1
    6a074a57b6c76 6a074a57c4ae9 6a074a57cc5b2`,
};

const BASE = BASE_PATH.endsWith('/') ? BASE_PATH : `${BASE_PATH}/`;
/** Caminho interno com o base path, como `href()` de src/lib/links.ts. @param {string} path */
const to = (path) => `${BASE}${path.replace(/^\/+/, '')}`;

/** @type {Record<string, string>} */
const redirects = {
  '/tortas': to('/cardapio/'),
  '/galeria': to('/'),
  '/galeria-1': to('/'),
  '/sobre-nós': to('/sobre/'),
  '/contatos': to('/contato/'),
  ...Object.fromEntries(
    Object.entries(SITE123_GALLERY_ITEMS).flatMap(([gallery, ids]) =>
      ids
        .trim()
        .split(/\s+/)
        .map((id) => [`/${gallery}/item-id-${id}`, to('/')]),
    ),
  ),
};

/**
 * O sitemap lista só URLs canônicas que respondem 200: ficam de fora as páginas de
 * redirecionamento e as de erro. (A integração já ignora as duas por padrão; o filtro
 * explícito garante isso contra mudanças de versão.)
 */
/** @param {string} path */
const routeKey = (path) => (path.endsWith('/') ? path : `${path}/`).normalize('NFC');
const NOT_IN_SITEMAP = new Set([...Object.keys(redirects), '/404', '/500'].map(routeKey));
/** @param {string} url */
function inSitemap(url) {
  const path = decodeURIComponent(new URL(url).pathname);
  return !NOT_IN_SITEMAP.has(routeKey(path.startsWith(BASE) ? `/${path.slice(BASE.length)}` : path));
}

export default defineConfig({
  site: SITE_URL,
  base: BASE_PATH,
  trailingSlash: 'always',
  build: { format: 'directory' },
  cacheDir: process.env.ASTRO_CACHE_DIR || './node_modules/.astro',
  env: {
    schema: {
      SITE_INDEXABLE: envField.boolean({ context: 'server', access: 'public', default: true }),
      PLAUSIBLE_DOMAIN: envField.string({ context: 'server', access: 'public', optional: true }),
    },
  },
  redirects,
  integrations: [sitemap({ filter: inSitemap })],
  image: { responsiveStyles: true },
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        ANALYTICS_ORIGIN ? `connect-src 'self' ${ANALYTICS_ORIGIN}` : "connect-src 'self'",
        'frame-src https://www.google.com',
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        'upgrade-insecure-requests',
      ],
      scriptDirective: { resources: ["'self'", ...(ANALYTICS_ORIGIN ? [ANALYTICS_ORIGIN] : [])] },
    },
  },
});
