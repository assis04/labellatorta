/**
 * Baixa as fotos originais do site atual (SITE123) para src/assets/fotos com nomes semânticos.
 * Rodar uma única vez: as fotos ficam versionadas no repositório e o build do Astro gera
 * as versões AVIF/WebP responsivas. Arquivos já existentes não são baixados de novo.
 */
import { mkdir, writeFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'src', 'assets', 'fotos');
const FILES = 'https://files.cdn-files-a.com/uploads/2612422/2000_';
const IMAGES = 'https://images.cdn-files-a.com/uploads/2612422/2000_';

/** @type {Array<[string, string]>} [nome local, URL de origem] */
const PHOTOS = [
  ['hero-fatia-frango-neon.jpg', `${FILES}6a073e9cf1e91.jpg`],
  ['torta-frango-corte.jpg', `${FILES}6a073e9cf06f6.jpg`],
  ['torta-frango.jpg', `${FILES}6a07431758896.jpg`],
  ['torta-calabresa.jpg', `${FILES}6a07435393299.jpg`],
  ['torta-shimeji.jpg', `${FILES}6a074376107e2.jpg`],
  ['torta-palmito.png', `${FILES}6a0743933704b.png`],
  ['torta-camarao.jpeg', `${IMAGES}5d9c8e6e1c594.jpeg`],
  ['torta-brocolis.png', `${FILES}6a0743d36a4f4.png`],
  ['torta-banoffee.jpg', `${FILES}6a07454ea15b6.jpg`],
  ['torta-chocolate.jpg', `${FILES}6a0745a08845e.jpg`],
  ['almoco-torta-salada-mesa.jpg', `${FILES}6a073e9d19d0a.jpg`],
  ['almoco-salao.jpg', `${FILES}6a073e9d154cb.jpg`],
  ['almoco-torta-salada-planta.jpg', `${FILES}6a073e9d184e9.jpg`],
  ['salada-burrata.jpg', `${FILES}6a073e9d08295.jpg`],
  ['salada-verde.jpg', `${FILES}6a073e9d06e1a.jpg`],
  ['encomenda-caixa.jpg', `${FILES}6a073e9d056fe.jpg`],
  ['torta-inteira-gratinada.jpg', `${FILES}6a073e9d0ff84.jpg`],
  ['preparo-creme-de-queijo.jpg', `${FILES}6a073e9d02a28.jpg`],
  ['banoffee-inteira.jpg', `${FILES}6a073e9ce5d7f.jpg`],
  ['camarao-servindo.jpg', `${FILES}6a073e9d128c2.jpg`],
  ['chocolate-pacoca-topo.jpg', `${FILES}6a073e9d00fba.jpg`],
  ['chocolate-fatia.jpg', `${FILES}6a073e9ceb7f1.jpg`],
  ['frango-fatias.jpg', `${FILES}6a073e9cea397.jpg`],
  ['tortas-variadas.jpeg', `${IMAGES}5d9b3e9c5e6a4.jpeg`],
  ['selo-restaurant-guru-2026.png', `${FILES}6a07413a60694.png`],
];

await mkdir(outDir, { recursive: true });
const results = await Promise.allSettled(
  PHOTOS.map(async ([name, url]) => {
    const target = join(outDir, name);
    try {
      await access(target);
      return `já existe: ${name}`;
    } catch {
      /* não existe: baixar */
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ao baixar ${url}`);
    await writeFile(target, Buffer.from(await res.arrayBuffer()));
    return `baixada: ${name}`;
  }),
);
let failed = 0;
for (const r of results) {
  if (r.status === 'fulfilled') console.log(r.value);
  else {
    failed++;
    console.error(r.reason instanceof Error ? r.reason.message : r.reason);
  }
}
if (failed) process.exit(1);
