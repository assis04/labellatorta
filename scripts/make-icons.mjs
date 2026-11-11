/**
 * Gera todos os ícones do site a partir de uma única geometria: uma fatia de torta vista de lado
 * (tampo + corte com as duas camadas de recheio), em creme sobre terracota.
 *
 *   public/favicon.svg ............ abas de navegador modernas (vetor, 16 px nítido)
 *   public/favicon.ico ............ 16 + 32 px, para quem pede /favicon.ico na raiz
 *   public/apple-touch-icon.png ... 180 px, sem transparência (o iOS arredonda os cantos)
 *   public/icon-192.png / icon-512.png ...... manifest, `purpose: any`
 *   public/icon-maskable-512.png ............ manifest, `purpose: maskable` (zona segura de 80%)
 *
 * Uso: `node scripts/make-icons.mjs` — rode de novo sempre que mudar a marca e versione os arquivos.
 */
import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const OUT = new URL('../public/', import.meta.url);
const TERRACOTTA = '#8C3A1C';
const CREAM = '#FAF7F2';
const CREAM_SHADE = '#EFDFC9';

/**
 * Fatia em grade 64×64, centrada em (32, 33). Faixas de terracota entre as faces dão o volume
 * e continuam legíveis em 16 px (cada 4 unidades = 1 pixel).
 */
const GLYPH = [
  // Tampo: ponta à esquerda, borda de massa arredondada ao fundo.
  `<path fill="${CREAM}" d="M8 28.5 39.5 13.5c6.6.2 12.6 3.3 16.5 8.3Z"/>`,
  // Corte, camada de cima (recheio + creme gratinado).
  `<path fill="${CREAM_SHADE}" d="M8 32.5 56 25.8v7.7L8 40.2Z"/>`,
  // Corte, camada de baixo (recheio sobre a massa fininha).
  `<path fill="${CREAM_SHADE}" d="M8 43.7 56 37v9.2L8 52.9Z"/>`,
].join('');

/** Fundo: quadrado de cantos arredondados (favicon, `any`) ou sangrado (iOS, maskable). */
const BACKGROUND = {
  rounded: `<path fill="${TERRACOTTA}" d="M14 0h36c7.7 0 14 6.3 14 14v36c0 7.7-6.3 14-14 14H14C6.3 64 0 57.7 0 50V14C0 6.3 6.3 0 14 0Z"/>`,
  square: `<path fill="${TERRACOTTA}" d="M0 0h64v64H0Z"/>`,
};

/**
 * @param {{ background: keyof typeof BACKGROUND, scale?: number, size?: number }} options
 * `scale` encolhe a fatia em torno do centro (zona segura); `size` fixa a resolução de saída.
 */
function svg({ background, scale = 1, size }) {
  const dims = size ? ` width="${size}" height="${size}"` : '';
  const glyph =
    scale === 1
      ? GLYPH
      : `<g transform="matrix(${scale} 0 0 ${scale} ${32 * (1 - scale)} ${32 * (1 - scale)})">${GLYPH}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"${dims}>${BACKGROUND[background]}${glyph}</svg>\n`;
}

/** @param {Omit<Parameters<typeof svg>[0], "size">} options @param {number} size */
function png(options, size) {
  return sharp(Buffer.from(svg({ ...options, size })))
    .png({ compressionLevel: 9, palette: true, effort: 10 })
    .toBuffer();
}

/**
 * ICO com PNGs embutidos (formato aceito por todos os navegadores atuais).
 * @param {Buffer[]} images @param {number[]} sizes
 */
function ico(images, sizes) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0); // reservado
  header.writeUInt16LE(1, 2); // tipo: ícone
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach((image, i) => {
    const entry = 6 + 16 * i;
    const size = sizes[i] ?? 0;
    header.writeUInt8(size >= 256 ? 0 : size, entry);
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    header.writeUInt8(0, entry + 2); // sem paleta
    header.writeUInt8(0, entry + 3); // reservado
    header.writeUInt16LE(1, entry + 4); // planos
    header.writeUInt16LE(32, entry + 6); // bits por pixel
    header.writeUInt32LE(image.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += image.length;
  });
  return Buffer.concat([header, ...images]);
}

/** @type {const} */
const ROUNDED = { background: 'rounded' };
// iOS e Android aplicam a própria máscara: fundo sangrado e fatia dentro da zona segura.
/** @type {const} */
const APPLE = { background: 'square', scale: 0.86 };
/** @type {const} */
const MASKABLE = { background: 'square', scale: 0.72 };

const outputs = {
  'favicon.svg': svg(ROUNDED),
  'favicon.ico': ico(await Promise.all([png(ROUNDED, 16), png(ROUNDED, 32)]), [16, 32]),
  'apple-touch-icon.png': await png(APPLE, 180),
  'icon-192.png': await png(ROUNDED, 192),
  'icon-512.png': await png(ROUNDED, 512),
  'icon-maskable-512.png': await png(MASKABLE, 512),
};

for (const [name, data] of Object.entries(outputs)) {
  await writeFile(new URL(name, OUT), data);
  console.log(`public/${name} (${Buffer.byteLength(data)} bytes)`);
}
