import { Request, Response, NextFunction } from 'express';
import { supabase } from '../services/supabase';
import { ApiError } from '../middleware/errorHandler';

const CAMPOS_LISTA = 'id, titulo, slug, resumo, capa_url, publicado_em';

function erroHttp(mensagem: string, statusCode: number): ApiError {
  const error: ApiError = new Error(mensagem);
  error.statusCode = statusCode;
  return error;
}

// Public: published articles, newest first (no body)
export async function listarArtigos(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select(CAMPOS_LISTA)
      .eq('published', true)
      .order('publicado_em', { ascending: false, nullsFirst: false });

    if (error) {
      next(erroHttp('Erro ao buscar artigos', 500));
      return;
    }

    res.status(200).json({ success: true, data: data || [] });
  } catch (error) {
    next(error);
  }
}

// Public: one published article by slug (drafts are 404)
export async function obterArtigoPorSlug(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { slug } = req.params;

    const { data, error } = await supabase
      .from('blog_posts')
      .select(`${CAMPOS_LISTA}, conteudo, autor`)
      .eq('slug', slug)
      .eq('published', true)
      .maybeSingle();

    if (error) {
      next(erroHttp('Erro ao buscar artigo', 500));
      return;
    }

    if (!data) {
      next(erroHttp('Artigo não encontrado', 404));
      return;
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
