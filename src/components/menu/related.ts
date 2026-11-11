/**
 * "Outros sabores" da página de um sabor: primeiro a mesma categoria (e, dentro dela, quem
 * compartilha selo — ex.: vegetariana leva a outras vegetarianas), depois a outra categoria.
 * A lista começa logo após o sabor atual, para que todas as páginas recebam links internos.
 */
import type { Torta } from '../../data/menu';
import { tortas } from '../../data/menu';

export function relatedTortas(current: Torta, count = 3): Torta[] {
  const index = tortas.findIndex((t) => t.slug === current.slug);
  const rotated = [...tortas.slice(index + 1), ...tortas.slice(0, Math.max(index, 0))].filter(
    (t) => t.slug !== current.slug,
  );
  const score = (t: Torta) =>
    (t.category === current.category ? 2 : 0) + (t.tags.some((tag) => current.tags.includes(tag)) ? 1 : 0);
  // Array.prototype.sort é estável: empates mantêm a ordem a partir do sabor atual.
  return rotated.sort((a, b) => score(b) - score(a)).slice(0, count);
}
