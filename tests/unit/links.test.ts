/**
 * URLs: todo link interno passa pelo base path (o site pode morar em /<repo>/ no GitHub Pages)
 * e todo link de WhatsApp leva uma mensagem pronta e corretamente codificada.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { business } from '../../src/data/business';
import type * as Links from '../../src/lib/links';

type LinksModule = typeof Links;

/** Carrega `links.ts` do zero com outro `BASE_URL` (o base path é lido na carga do módulo). */
async function loadLinks(baseUrl?: string): Promise<LinksModule> {
  vi.resetModules();
  if (baseUrl !== undefined) vi.stubEnv('BASE_URL', baseUrl);
  return import('../../src/lib/links');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

const SITE = new URL('https://www.labellatorta.com.br');

describe('href', () => {
  it.each(['/', '/labellatorta/'])('aplica o base path "%s"', async (base) => {
    const { href } = await loadLinks(base);
    expect(href('/')).toBe(base);
    expect(href('/cardapio/')).toBe(`${base}cardapio/`);
    expect(href('/tortas/torta-de-frango/')).toBe(`${base}tortas/torta-de-frango/`);
    expect(href('cardapio/')).toBe(`${base}cardapio/`);
    expect(href('//cardapio/')).toBe(`${base}cardapio/`);
  });

  it('acrescenta a barra final ao base path quando ela falta', async () => {
    const { href } = await loadLinks('/labellatorta');
    expect(href('/cardapio/')).toBe('/labellatorta/cardapio/');
  });

  it('mantém intactos links absolutos, mailto, tel e âncoras', async () => {
    const { href } = await loadLinks('/labellatorta/');
    for (const url of [
      'https://wa.me/5511947367606',
      'http://example.com/a/',
      'mailto:labellatorta339@gmail.com',
      'tel:+5511947367606',
      '#conteudo',
    ]) {
      expect(href(url)).toBe(url);
    }
  });

  it('usa o base path da configuração do Astro por padrão', async () => {
    const { href } = await loadLinks();
    const base = import.meta.env.BASE_URL.endsWith('/')
      ? import.meta.env.BASE_URL
      : `${import.meta.env.BASE_URL}/`;
    expect(href('/sobre/')).toBe(`${base}sobre/`);
  });
});

describe('absoluteUrl', () => {
  it('gera URL absoluta com o base path', async () => {
    const { absoluteUrl } = await loadLinks('/labellatorta/');
    expect(absoluteUrl('/cardapio/', SITE)).toBe('https://www.labellatorta.com.br/labellatorta/cardapio/');
    expect(absoluteUrl('/', SITE)).toBe('https://www.labellatorta.com.br/labellatorta/');
  });

  it('na raiz do domínio, gera a URL canônica do site', async () => {
    const { absoluteUrl } = await loadLinks('/');
    expect(absoluteUrl('/sobre/', SITE)).toBe('https://www.labellatorta.com.br/sobre/');
  });

  it('falha de forma explícita sem `site` configurado', async () => {
    const { absoluteUrl } = await loadLinks('/');
    expect(() => absoluteUrl('/', undefined)).toThrow(/site/);
  });
});

describe('whatsappUrl', () => {
  const textOf = (url: string) => new URL(url).searchParams.get('text');

  it('aponta para o número oficial no wa.me', async () => {
    const { whatsappUrl } = await loadLinks();
    const url = new URL(whatsappUrl());
    expect(url.origin).toBe('https://wa.me');
    expect(url.pathname).toBe(`/${business.whatsappNumber}`);
  });

  it('usa a intenção "pedido" por padrão', async () => {
    const { whatsappUrl, WHATSAPP_MESSAGES } = await loadLinks();
    expect(textOf(whatsappUrl())).toBe(WHATSAPP_MESSAGES.pedido);
  });

  it.each(['pedido', 'encomenda', 'almoco'] as const)('aceita a intenção "%s"', async (intent) => {
    const { whatsappUrl, WHATSAPP_MESSAGES } = await loadLinks();
    expect(textOf(whatsappUrl(intent))).toBe(WHATSAPP_MESSAGES[intent]);
  });

  it('aceita texto livre e o codifica por completo', async () => {
    const { whatsappUrl } = await loadLinks();
    const message = 'Olá! Quero 2 fatias & 1 torta #frango? 50% já\nNome: Ana';
    const url = whatsappUrl(message);
    expect(textOf(url)).toBe(message);
    expect(url).toBe(`https://wa.me/${business.whatsappNumber}?text=${encodeURIComponent(message)}`);
    const query = url.slice(url.indexOf('?text=') + '?text='.length);
    // Nada que quebre a query string: espaço, &, #, ? e % solto.
    expect(query).not.toMatch(/[\s&#?]|%(?![0-9A-F]{2})/u);
    expect(query).not.toMatch(/[^\x20-\x7e]/u);
  });

  it('codifica os acentos das mensagens prontas', async () => {
    const { whatsappUrl } = await loadLinks();
    expect(whatsappUrl('almoco')).toContain('Ol%C3%A1');
    expect(whatsappUrl('almoco')).toContain('almo%C3%A7o');
  });

  it.each(['toString', 'constructor', 'hasOwnProperty', '__proto__'])(
    'trata "%s" como texto livre, não como chave herdada do protótipo',
    async (message) => {
      const { whatsappUrl } = await loadLinks();
      expect(textOf(whatsappUrl(message))).toBe(message);
    },
  );
});

describe('whatsappOrderUrl', () => {
  it('monta a mensagem de encomenda do sabor, em minúsculas no meio da frase', async () => {
    const { whatsappOrderUrl } = await loadLinks();
    const url = new URL(whatsappOrderUrl('Torta de Chocolate com Paçoca'));
    expect(url.pathname).toBe(`/${business.whatsappNumber}`);
    expect(url.searchParams.get('text')).toBe(
      'Olá, La Bella Torta! Gostaria de encomendar uma torta de chocolate com paçoca inteira.',
    );
  });
});

describe('telUrl e mailUrl', () => {
  it('usam o telefone em E.164 e o e-mail oficial', async () => {
    const { telUrl, mailUrl } = await loadLinks();
    expect(telUrl).toBe(`tel:${business.phone.e164}`);
    expect(telUrl).toMatch(/^tel:\+\d{12,13}$/);
    expect(mailUrl).toBe(`mailto:${business.email}`);
  });
});
