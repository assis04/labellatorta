/**
 * Conteúdo editorial compartilhado: perguntas frequentes, avaliações e navegação.
 * As respostas usam apenas fatos confirmados pela casa (site atual e Instagram).
 */
import { business, fullAddress } from './business';

export interface FaqItem {
  question: string;
  answer: string;
}

export const faq: readonly FaqItem[] = [
  {
    question: 'Onde fica a La Bella Torta?',
    answer: `Na ${fullAddress}, na região do Tatuapé, Zona Leste de São Paulo.`,
  },
  {
    question: 'Qual o horário de funcionamento?',
    answer:
      'De segunda a sexta, das 11h às 21h. Aos sábados, das 11h às 16h. Aos domingos a casa fica fechada.',
  },
  {
    question: 'Como faço um pedido?',
    answer: `Pelo WhatsApp ${business.phone.display}. É só dizer o sabor e se é fatia ou torta inteira, e combinar a retirada ou a entrega.`,
  },
  {
    question: 'Dá para encomendar torta inteira?',
    answer: `Sim. Todos os sabores podem ser encomendados inteiros pelo WhatsApp ${business.phone.display}: informe o sabor e o dia, e a gente combina a retirada ou a entrega.`,
  },
  {
    question: 'Vocês servem almoço?',
    answer:
      'Sim. No almoço você escolhe uma fatia de torta salgada e acompanha com a salada da casa, de segunda a sábado, a partir das 11h.',
  },
  {
    question: 'Tem opção vegetariana?',
    answer:
      'Tem três tortas salgadas sem carne: shimeji com cream cheese, palmito e brócolis. As tortas doces — banoffee e chocolate com paçoca — também não levam carne.',
  },
  {
    question: 'O que torna a torta da La Bella Torta diferente?',
    answer:
      'A massa é bem fininha, só na base e nas bordas. Por cima vão duas camadas generosas de recheio, cobertas com o creme de queijo da casa — uma receita própria — e gratinadas no forno.',
  },
  {
    question: 'Quais tortas doces vocês têm?',
    answer:
      'Banoffee (banana, doce de leite uruguaio, chantilly e chocolate belga) e chocolate com paçoca (ganache meio amargo coberto com paçoca).',
  },
];

export interface Review {
  author: string;
  text: string;
  rating: 1 | 2 | 3 | 4 | 5;
  /** ISO 8601 */
  date: string;
  source: 'Google';
}

/**
 * Avaliações reais, copiadas do Perfil da Empresa no Google com autorização do cliente.
 * Enquanto estiver vazio, o site mostra um convite para ler as avaliações no Google —
 * nunca depoimentos inventados.
 */
export const reviews: readonly Review[] = [];

export interface NavItem {
  label: string;
  /** Caminho sem o base path, sempre com barra no fim. */
  path: string;
}

export const mainNav: readonly NavItem[] = [
  { label: 'Cardápio', path: '/cardapio/' },
  { label: 'Almoço', path: '/almoco/' },
  { label: 'Encomendas', path: '/encomendas/' },
  { label: 'Sobre nós', path: '/sobre/' },
  { label: 'Contato', path: '/contato/' },
];

export const footerNav: readonly NavItem[] = [
  ...mainNav,
  { label: 'Perguntas frequentes', path: '/perguntas-frequentes/' },
  { label: 'Política de privacidade', path: '/politica-de-privacidade/' },
];
