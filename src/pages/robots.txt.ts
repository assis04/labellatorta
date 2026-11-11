/**
 * robots.txt gerado no build a partir de SITE_INDEXABLE.
 *
 * Rastreadores só leem o robots.txt na RAIZ do host (https://host/robots.txt). Publicado em
 * subcaminho — https://<usuario>.github.io/<repo>/robots.txt — este arquivo é ignorado: ali
 * quem impede a indexação da prévia é a meta `robots: noindex, nofollow` aplicada pelo layout
 * (SITE_INDEXABLE=false). Na raiz (domínio próprio, contêiner local) ele vale normalmente.
 *
 * - Prévia: bloqueia todos os rastreadores e não anuncia o sitemap.
 * - Produção: libera tudo, convida explicitamente buscadores e assistentes de IA (é assim que a
 *   casa aparece em respostas do Google, ChatGPT, Claude, Perplexity e Siri) e aponta o sitemap.
 */
import type { APIRoute } from 'astro';
import { SITE_INDEXABLE } from 'astro:env/server';
import { absoluteUrl } from '../lib/links';

/** Buscadores e rastreadores de IA (busca, treino e acesso a pedido do usuário). */
const WELCOME_CRAWLERS = [
  'Googlebot',
  'Bingbot',
  'Google-Extended',
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'PerplexityBot',
  'Applebot-Extended',
] as const;

/** Um grupo por agente: é o formato que todo parser entende (RFC 9309 §2.1). */
const group = (agent: string, rule: string) => `User-agent: ${agent}\n${rule}\n`;

function production(sitemapUrl: string): string {
  return [
    '# Conteúdo público: buscadores e assistentes de IA podem rastrear e citar este site.\n',
    ...WELCOME_CRAWLERS.map((agent) => group(agent, 'Allow: /')),
    group('*', 'Allow: /'),
    `Sitemap: ${sitemapUrl}\n`,
  ].join('\n');
}

function preview(): string {
  return [
    '# Prévia: este endereço não é o site oficial e não deve ser indexado.\n',
    group('*', 'Disallow: /'),
  ].join('\n');
}

export const GET: APIRoute = ({ site }) => {
  const body = SITE_INDEXABLE ? production(absoluteUrl('/sitemap-index.xml', site)) : preview();
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
