const LIMITE_SLUG = 80;
const RESERVADOS = ['admin'];

export function gerarSlug(titulo: string): string {
  const slug = titulo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, LIMITE_SLUG)
    .replace(/-+$/g, '');

  return slug || 'artigo';
}

export function slugDisponivel(base: string, existentes: string[]): string {
  const usados = new Set([...existentes, ...RESERVADOS]);
  if (!usados.has(base)) return base;

  let n = 2;
  while (usados.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}
