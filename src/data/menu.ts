import type { ImageMetadata } from 'astro';
import frango from '../assets/fotos/torta-frango.jpg';
import frangoCorte from '../assets/fotos/torta-frango-corte.jpg';
import calabresa from '../assets/fotos/torta-calabresa.jpg';
import shimeji from '../assets/fotos/torta-shimeji.jpg';
import palmito from '../assets/fotos/torta-palmito.png';
import camarao from '../assets/fotos/torta-camarao.jpeg';
import camaraoServindo from '../assets/fotos/camarao-servindo.jpg';
import brocolis from '../assets/fotos/torta-brocolis.png';
import banoffee from '../assets/fotos/torta-banoffee.jpg';
import banoffeeInteira from '../assets/fotos/banoffee-inteira.jpg';
import chocolate from '../assets/fotos/torta-chocolate.jpg';
import chocolateTopo from '../assets/fotos/chocolate-pacoca-topo.jpg';

export type TortaCategory = 'salgada' | 'doce';
export type TortaTag = 'vegetariana' | 'versao-apimentada';

export interface Photo {
  src: ImageMetadata;
  alt: string;
}

export interface Torta {
  slug: string;
  name: string;
  category: TortaCategory;
  /** Uma frase, usada em cards e na meta description. */
  summary: string;
  /** Parágrafo da página do sabor. Só fatos fornecidos pela casa. */
  description: string;
  ingredients: readonly string[];
  tags: readonly TortaTag[];
  photo: Photo;
  gallery: readonly Photo[];
  /** Preços em reais. `null` = ainda não informado pela casa: a interface mostra "consulte". */
  price: { slice: number | null; whole: number | null };
}

const BASE_SALGADA =
  'Como todas as nossas tortas, ela tem massa bem fininha só na base e nas bordas, com duas camadas generosas de recheio por cima.';
const BASE_DOCE = 'A massa é bem fininha, para o recheio ser o protagonista.';

export const tortas: readonly Torta[] = [
  {
    slug: 'torta-de-frango',
    name: 'Torta de frango',
    category: 'salgada',
    summary: 'Frango desfiado bem temperado, coberto com o creme de queijo da casa.',
    description: `Recheio de frango desfiado e bem temperado, coberto com o nosso creme de queijo — uma receita própria da casa — e gratinado no forno. ${BASE_SALGADA}`,
    ingredients: ['Frango desfiado temperado', 'Creme de queijo da casa', 'Massa fininha'],
    tags: [],
    photo: {
      src: frango,
      alt: 'Fatia de torta de frango com recheio de frango desfiado e creme de queijo gratinado',
    },
    gallery: [
      {
        src: frangoCorte,
        alt: 'Fatia de torta de frango vista de lado, mostrando a massa fina na base, o recheio e a camada de creme de queijo',
      },
    ],
    price: { slice: null, whole: null },
  },
  {
    slug: 'torta-de-calabresa',
    name: 'Torta de calabresa',
    category: 'salgada',
    summary: 'Calabresa em recheio suculento, coberta com a receita secreta de creme de queijo.',
    description: `Linguiça calabresa transformada num recheio suculento, coberta com a nossa receita secreta de creme de queijo. Tem na versão tradicional e na versão apimentada. ${BASE_SALGADA}`,
    ingredients: ['Linguiça calabresa', 'Creme de queijo da casa', 'Massa fininha'],
    tags: ['versao-apimentada'],
    photo: {
      src: calabresa,
      alt: 'Fatia de torta de calabresa servida numa espátula, com o letreiro em neon da La Bella Torta ao fundo',
    },
    gallery: [],
    price: { slice: null, whole: null },
  },
  {
    slug: 'torta-de-shimeji-com-cream-cheese',
    name: 'Torta de shimeji com cream cheese',
    category: 'salgada',
    summary: 'Shimeji temperado com cebolinha e shoyu, sob uma camada de cream cheese.',
    description: `Shimeji temperado com cebolinha e shoyu, coberto com uma camada cremosa de cream cheese. Uma das nossas opções sem carne. ${BASE_SALGADA}`,
    ingredients: ['Shimeji', 'Cebolinha', 'Shoyu', 'Cream cheese', 'Massa fininha'],
    tags: ['vegetariana'],
    photo: { src: shimeji, alt: 'Fatia de torta de shimeji com camada espessa de cream cheese' },
    gallery: [],
    price: { slice: null, whole: null },
  },
  {
    slug: 'torta-de-palmito',
    name: 'Torta de palmito',
    category: 'salgada',
    summary: 'Palmito com o tempero da casa, misturado ao legítimo Catupiry.',
    description: `Palmito com o nosso tempero, misturado ao legítimo Catupiry. Uma das nossas opções sem carne. ${BASE_SALGADA}`,
    ingredients: ['Palmito', 'Catupiry', 'Tempero da casa', 'Massa fininha'],
    tags: ['vegetariana'],
    photo: { src: palmito, alt: 'Fatia de torta de palmito servida em prato azul' },
    gallery: [],
    price: { slice: null, whole: null },
  },
  {
    slug: 'torta-de-camarao',
    name: 'Torta de camarão',
    category: 'salgada',
    summary: 'Camarões num recheio de sabor marcante, coberto com creme de queijos.',
    description: `Camarões transformados num recheio de sabor marcante, cobertos com a nossa receita secreta de creme de queijos. ${BASE_SALGADA}`,
    ingredients: ['Camarão', 'Creme de queijos da casa', 'Massa fininha'],
    tags: [],
    photo: { src: camarao, alt: 'Fatia de torta de camarão num prato, com a torta inteira ao fundo' },
    gallery: [{ src: camaraoServindo, alt: 'Fatia de torta de camarão sendo servida' }],
    price: { slice: null, whole: null },
  },
  {
    slug: 'torta-de-brocolis',
    name: 'Torta de brócolis',
    category: 'salgada',
    summary: 'Brócolis bem verdinho e temperado, com cream cheese cremoso.',
    description: `Brócolis bem verdinho e temperado, com cream cheese cremoso. Uma das nossas opções sem carne. ${BASE_SALGADA}`,
    ingredients: ['Brócolis', 'Cream cheese', 'Massa fininha'],
    tags: ['vegetariana'],
    photo: { src: brocolis, alt: 'Fatia de torta de brócolis com cream cheese' },
    gallery: [],
    price: { slice: null, whole: null },
  },
  {
    slug: 'torta-banoffee',
    name: 'Torta banoffee',
    category: 'doce',
    summary: 'Banana sobre doce de leite uruguaio, chantilly e raspas de chocolate belga.',
    description: `Fatias de banana sobre uma camada generosa de doce de leite uruguaio, cobertas com chantilly e raspas de chocolate belga. ${BASE_DOCE}`,
    ingredients: ['Banana', 'Doce de leite uruguaio', 'Chantilly', 'Chocolate belga', 'Massa fininha'],
    tags: [],
    photo: {
      src: banoffee,
      alt: 'Fatia de torta banoffee com doce de leite, banana, chantilly e raspas de chocolate',
    },
    gallery: [{ src: banoffeeInteira, alt: 'Torta banoffee inteira decorada com rodelas de banana' }],
    price: { slice: null, whole: null },
  },
  {
    slug: 'torta-de-chocolate-com-pacoca',
    name: 'Torta de chocolate com paçoca',
    category: 'doce',
    summary: 'Ganache meio amargo coberto com paçoca, sobre massa bem fininha.',
    description: `Ganache de chocolate meio amargo coberto com paçoca. ${BASE_DOCE}`,
    ingredients: ['Ganache meio amargo', 'Paçoca', 'Massa fininha'],
    tags: [],
    photo: { src: chocolate, alt: 'Fatia de torta de chocolate meio amargo coberta com paçoca' },
    gallery: [{ src: chocolateTopo, alt: 'Torta de chocolate inteira coberta de paçoca, vista de cima' }],
    price: { slice: null, whole: null },
  },
];

export const tagLabels: Record<TortaTag, string> = {
  vegetariana: 'Vegetariana',
  'versao-apimentada': 'Também apimentada',
};

export const salgadas = tortas.filter((t) => t.category === 'salgada');
export const doces = tortas.filter((t) => t.category === 'doce');
export const vegetarianas = tortas.filter((t) => t.tags.includes('vegetariana'));

/** Destaques da home: 4 salgadas + 2 doces. */
export const destaques: readonly Torta[] = [
  ...['torta-de-frango', 'torta-de-calabresa', 'torta-de-camarao', 'torta-de-shimeji-com-cream-cheese'].map(
    (slug) => getTorta(slug),
  ),
  ...doces,
];

export function getTorta(slug: string): Torta {
  const torta = tortas.find((t) => t.slug === slug);
  if (!torta) throw new Error(`Torta não encontrada: ${slug}`);
  return torta;
}

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** "R$ 12,00" ou `null` quando a casa ainda não informou o preço. */
export function formatPrice(value: number | null): string | null {
  return value === null ? null : brl.format(value);
}
