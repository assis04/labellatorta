/**
 * Apoio aos dados estruturados das páginas do cardápio: o mesmo contexto que o Base.astro monta
 * e a URL absoluta de uma versão otimizada da foto (o JSON-LD precisa de URL absoluta).
 */
import type { ImageMetadata } from 'astro';
import { getImage } from 'astro:assets';
import { absoluteUrl } from '../../lib/links';
import type { SchemaContext } from '../../lib/schema';

const SCHEMA_IMAGE_WIDTH = 1200;

function requireSite(site: URL | undefined): URL {
  if (!site) throw new Error('Defina `site` no astro.config.mjs para gerar dados estruturados');
  return site;
}

export function schemaContext(site: URL | undefined): SchemaContext {
  const origin = requireSite(site);
  return { homeUrl: absoluteUrl('/', origin), abs: (path) => absoluteUrl(path, origin) };
}

/** URL absoluta de uma versão WebP de até 1200 px da foto (sem ampliar fotos menores). */
export async function schemaImageUrl(src: ImageMetadata, site: URL | undefined): Promise<string> {
  const image = await getImage({
    src,
    width: Math.min(SCHEMA_IMAGE_WIDTH, src.width),
    format: 'webp',
    quality: 80,
  });
  return new URL(image.src, requireSite(site)).toString();
}
