import { Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { supabase } from '../services/supabase';
import { ApiError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { ErroValidacao, validarArtigo } from '../utils/artigoValidacao';
import { gerarSlug, slugDisponivel } from '../utils/slug';
import { proximoPublicadoEm } from '../utils/publicacao';

const AUTOR = 'David Areias Vianna';
const BUCKET_CAPAS = 'artigos-capas';
const CAMPOS_ADMIN = 'id, titulo, slug, resumo, capa_url, published, publicado_em, created_at, updated_at';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EXTENSAO_POR_TIPO: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function erroHttp(mensagem: string, statusCode: number): ApiError {
  const error: ApiError = new Error(mensagem);
  error.statusCode = statusCode;
  return error;
}

function idValido(id: string): boolean {
  return UUID.test(id);
}

// All articles, drafts included (protected)
export async function listarArtigosAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select(CAMPOS_ADMIN)
      .order('created_at', { ascending: false });

    if (error) {
      next(erroHttp('Erro ao buscar artigos', 500));
      return;
    }

    res.status(200).json({ success: true, data: data || [] });
  } catch (error) {
    next(error);
  }
}

// One article with body, for editing (protected)
export async function obterArtigoAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id);
    if (!idValido(id)) {
      next(erroHttp('Artigo não encontrado', 404));
      return;
    }

    const { data, error } = await supabase
      .from('blog_posts')
      .select(`${CAMPOS_ADMIN}, conteudo`)
      .eq('id', id)
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

// Create (protected). The slug is generated once and never changes.
export async function criarArtigo(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    let entrada;
    try {
      entrada = validarArtigo(req.body);
    } catch (e) {
      if (e instanceof ErroValidacao) {
        next(erroHttp(e.message, 400));
        return;
      }
      throw e;
    }

    const base = gerarSlug(entrada.titulo);
    const { data: existentes, error: slugError } = await supabase
      .from('blog_posts')
      .select('slug')
      .like('slug', `${base}%`);

    if (slugError) {
      next(erroHttp('Erro ao salvar artigo', 500));
      return;
    }

    const slug = slugDisponivel(base, (existentes || []).map((linha) => linha.slug as string));
    const agora = new Date().toISOString();

    const { data, error } = await supabase
      .from('blog_posts')
      .insert([
        {
          titulo: entrada.titulo,
          slug,
          resumo: entrada.resumo,
          conteudo: entrada.conteudo,
          capa_url: entrada.capa_url,
          autor: AUTOR,
          published: entrada.published,
          publicado_em: proximoPublicadoEm(entrada.published, null, agora),
        },
      ])
      .select('id, slug')
      .single();

    if (error || !data) {
      const duplicado = error?.code === '23505';
      next(
        erroHttp(
          duplicado ? 'Já existe um artigo com esse endereço. Tente novamente.' : 'Erro ao salvar artigo',
          duplicado ? 400 : 500
        )
      );
      return;
    }

    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// Update everything except the slug (protected)
export async function atualizarArtigo(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id);
    if (!idValido(id)) {
      next(erroHttp('Artigo não encontrado', 404));
      return;
    }

    let entrada;
    try {
      entrada = validarArtigo(req.body);
    } catch (e) {
      if (e instanceof ErroValidacao) {
        next(erroHttp(e.message, 400));
        return;
      }
      throw e;
    }

    const { data: atual, error: buscaError } = await supabase
      .from('blog_posts')
      .select('id, publicado_em')
      .eq('id', id)
      .maybeSingle();

    if (buscaError) {
      next(erroHttp('Erro ao salvar artigo', 500));
      return;
    }
    if (!atual) {
      next(erroHttp('Artigo não encontrado', 404));
      return;
    }

    const agora = new Date().toISOString();
    const { error } = await supabase
      .from('blog_posts')
      .update({
        titulo: entrada.titulo,
        resumo: entrada.resumo,
        conteudo: entrada.conteudo,
        capa_url: entrada.capa_url,
        published: entrada.published,
        publicado_em: proximoPublicadoEm(entrada.published, atual.publicado_em, agora),
        updated_at: agora,
      })
      .eq('id', id);

    if (error) {
      next(erroHttp('Erro ao salvar artigo', 500));
      return;
    }

    res.status(200).json({ success: true, message: 'Artigo salvo com sucesso' });
  } catch (error) {
    next(error);
  }
}

// Publish / unpublish without resending the body (protected)
export async function alterarPublicacao(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id);
    if (!idValido(id)) {
      next(erroHttp('Artigo não encontrado', 404));
      return;
    }
    if (typeof req.body?.published !== 'boolean') {
      next(erroHttp('Informe se o artigo deve ser publicado (true) ou voltar a rascunho (false)', 400));
      return;
    }
    const published: boolean = req.body.published;

    const { data: atual, error: buscaError } = await supabase
      .from('blog_posts')
      .select('id, publicado_em')
      .eq('id', id)
      .maybeSingle();

    if (buscaError) {
      next(erroHttp('Erro ao atualizar artigo', 500));
      return;
    }
    if (!atual) {
      next(erroHttp('Artigo não encontrado', 404));
      return;
    }

    const agora = new Date().toISOString();
    const publicado_em = proximoPublicadoEm(published, atual.publicado_em, agora);
    const { error } = await supabase
      .from('blog_posts')
      .update({ published, publicado_em, updated_at: agora })
      .eq('id', id);

    if (error) {
      next(erroHttp('Erro ao atualizar artigo', 500));
      return;
    }

    res.status(200).json({ success: true, data: { published, publicado_em } });
  } catch (error) {
    next(error);
  }
}

// Delete (protected)
export async function excluirArtigo(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id);
    if (!idValido(id)) {
      next(erroHttp('Artigo não encontrado', 404));
      return;
    }

    const { data, error } = await supabase.from('blog_posts').delete().eq('id', id).select('id');

    if (error) {
      next(erroHttp('Erro ao excluir artigo', 500));
      return;
    }
    if (!data || data.length === 0) {
      next(erroHttp('Artigo não encontrado', 404));
      return;
    }

    res.status(200).json({ success: true, message: 'Artigo excluído com sucesso' });
  } catch (error) {
    next(error);
  }
}

// Signed upload URL so the browser sends the cover straight to Supabase Storage (protected)
export async function gerarUrlCapa(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const contentType = req.body?.contentType;
    const extensao = typeof contentType === 'string' ? EXTENSAO_POR_TIPO[contentType] : undefined;
    if (!extensao) {
      next(erroHttp('Envie uma imagem JPG, PNG ou WebP', 400));
      return;
    }

    const caminho = `${randomUUID()}.${extensao}`;
    const { data, error } = await supabase.storage.from(BUCKET_CAPAS).createSignedUploadUrl(caminho);

    if (error || !data) {
      next(erroHttp('Erro ao preparar o envio da imagem', 500));
      return;
    }

    const { data: publica } = supabase.storage.from(BUCKET_CAPAS).getPublicUrl(caminho);

    res.status(201).json({ success: true, uploadUrl: data.signedUrl, publicUrl: publica.publicUrl });
  } catch (error) {
    next(error);
  }
}
