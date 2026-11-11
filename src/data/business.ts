/**
 * Fonte única da verdade sobre a casa. Página, dados estruturados (schema.org),
 * llms.txt e rodapé leem daqui — mudou aqui, muda em todo lugar.
 * Campos `null` são informações ainda não confirmadas pelo cliente (ver PENDENCIAS.md);
 * a interface e o schema simplesmente omitem o que for `null`.
 */

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = domingo

export interface OpeningPeriod {
  days: readonly Weekday[];
  /** "HH:MM", horário de São Paulo */
  opens: string;
  /** "HH:MM", horário de São Paulo */
  closes: string;
}

export const TIMEZONE = 'America/Sao_Paulo';

export const business = {
  name: 'La Bella Torta',
  tagline: 'Tortaria artesanal',
  slogan: 'Muito mais que uma simples torta',
  description:
    'Tortaria artesanal no Parque São Jorge, Zona Leste de São Paulo. Tortas salgadas e doces com massa fininha na base e duas camadas de recheio — na fatia, no almoço com salada ou inteiras por encomenda.',
  phone: { e164: '+5511947367606', display: '(11) 94736-7606' },
  whatsappNumber: '5511947367606',
  email: 'labellatorta339@gmail.com',
  address: {
    street: 'Rua Antônio Macedo, 339',
    neighborhood: 'Parque São Jorge',
    district: 'Tatuapé',
    city: 'São Paulo',
    state: 'SP',
    postalCode: null as string | null,
    country: 'BR',
  },
  geo: { latitude: -23.5299455, longitude: -46.5642889 },
  social: {
    instagram: 'https://www.instagram.com/labella_torta/',
    instagramHandle: '@labella_torta',
    instagramFollowers: '12 mil',
    facebook: 'https://www.facebook.com/labellatort',
  },
  award: { name: 'Recomendado pelo Restaurant Guru', year: 2026 },
  servesCuisine: ['Tortas', 'Brasileira'],
  priceRange: '$$',
  foundedYear: null as number | null,
  acceptsReservations: false,
} as const;

export const openingHours: readonly OpeningPeriod[] = [
  { days: [1, 2, 3, 4, 5], opens: '11:00', closes: '21:00' },
  { days: [6], opens: '11:00', closes: '16:00' },
];

const mapsQuery = encodeURIComponent(
  `${business.name}, ${business.address.street} - ${business.address.neighborhood}, ${business.address.city} - ${business.address.state}`,
);

export const links = {
  googleMaps: `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`,
  googleMapsEmbed: `https://www.google.com/maps?q=${mapsQuery}&output=embed`,
  waze: `https://waze.com/ul?ll=${business.geo.latitude},${business.geo.longitude}&navigate=yes`,
  /** Link de avaliações no Google: trocar pelo link curto do Perfil da Empresa quando o cliente enviar. */
  googleReviews: `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`,
} as const;

/** Endereço em uma linha, para texto corrido. */
export const fullAddress = `${business.address.street} – ${business.address.neighborhood}, ${business.address.city} – ${business.address.state}`;
