/**
 * Marcadores de texto provisório que nunca podem chegar ao site publicado
 * (usados pelos testes de dados e pelos testes do build).
 *
 * "TODO" só em maiúsculas: "todo"/"todos" é palavra comum em português.
 */
export const PLACEHOLDER_PATTERNS: readonly RegExp[] = [
  /\bvalidar\b/iu,
  /\bTODO\b/u,
  /\bFIXME\b/u,
  /\blorem\b/iu,
  /R\$\s*[—–-]/u,
  /\bx+,x+\b/iu,
];

/** Marcadores encontrados no texto, cada um com um trecho em volta para a mensagem de erro. */
export function findPlaceholders(text: string): string[] {
  const found: string[] = [];
  for (const re of PLACEHOLDER_PATTERNS) {
    const match = re.exec(text);
    if (match) {
      const start = Math.max(0, match.index - 40);
      const snippet = text.slice(start, match.index + match[0].length + 40).replace(/\s+/gu, ' ');
      found.push(`"${match[0]}" em "…${snippet}…"`);
    }
  }
  return found;
}
