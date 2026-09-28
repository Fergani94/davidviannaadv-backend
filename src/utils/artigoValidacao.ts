import { sanitizarHtml, textoDoHtml } from './sanitizar';

export const LIMITE_TITULO = 200;
export const LIMITE_RESUMO = 300;

export interface ArtigoEntrada {
  titulo: string;
  resumo: string;
  conteudo: string;
  capa_url: string | null;
  published: boolean;
}

export class ErroValidacao extends Error {}

function prefixoCapas(): string {
  const base = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  return `${base}/storage/v1/object/public/artigos-capas/`;
}

export function validarArtigo(corpo: unknown): ArtigoEntrada {
  if (!corpo || typeof corpo !== 'object') {
    throw new ErroValidacao('Dados do artigo não informados');
  }
  const dados = corpo as Record<string, unknown>;

  if (typeof dados.titulo !== 'string' || !dados.titulo.trim()) {
    throw new ErroValidacao('Informe o título do artigo');
  }
  const titulo = dados.titulo.trim();
  if (titulo.length > LIMITE_TITULO) {
    throw new ErroValidacao(`O título deve ter no máximo ${LIMITE_TITULO} caracteres`);
  }

  if (typeof dados.resumo !== 'string' || !dados.resumo.trim()) {
    throw new ErroValidacao('Informe o resumo do artigo');
  }
  const resumo = dados.resumo.trim();
  if (resumo.length > LIMITE_RESUMO) {
    throw new ErroValidacao(`O resumo deve ter no máximo ${LIMITE_RESUMO} caracteres`);
  }

  if (typeof dados.conteudo !== 'string') {
    throw new ErroValidacao('Escreva o texto do artigo');
  }
  const conteudo = sanitizarHtml(dados.conteudo);
  if (!textoDoHtml(conteudo)) {
    throw new ErroValidacao('Escreva o texto do artigo');
  }

  let capa_url: string | null = null;
  if (typeof dados.capa_url === 'string' && dados.capa_url.trim()) {
    const url = dados.capa_url.trim();
    if (!url.startsWith(prefixoCapas())) {
      throw new ErroValidacao('Imagem de capa inválida');
    }
    capa_url = url;
  }

  return { titulo, resumo, conteudo, capa_url, published: dados.published === true };
}
