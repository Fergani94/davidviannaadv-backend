import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { supabase } from '../services/supabase';
import { ApiError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';

// Get public approved testimonials
export async function obterDepoimentos(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('depoimentos')
      .select('id, nome, texto, created_at')
      .eq('status', 'aprovado')
      .order('created_at', { ascending: false });

    if (error) {
      const apiError: ApiError = new Error('Erro ao buscar depoimentos');
      apiError.statusCode = 500;
      next(apiError);
      return;
    }

    res.status(200).json({
      success: true,
      data: data || []
    });
  } catch (error) {
    next(error);
  }
}

// Submit testimonial with token validation
export async function enviarDepoimento(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token, nome, texto } = req.body;

    if (!token || !nome || !texto) {
      const error: ApiError = new Error('Token, nome e depoimento são obrigatórios');
      error.statusCode = 400;
      next(error);
      return;
    }

    // Token lives on a placeholder row created by the admin (status 'aguardando')
    const { data: row, error: tokenError } = await supabase
      .from('depoimentos')
      .select('id, token_expires_at')
      .eq('token', token)
      .eq('status', 'aguardando')
      .maybeSingle();

    if (tokenError || !row) {
      const error: ApiError = new Error('Token inválido ou já utilizado');
      error.statusCode = 400;
      next(error);
      return;
    }

    if (row.token_expires_at && new Date() > new Date(row.token_expires_at)) {
      const error: ApiError = new Error('Token expirado');
      error.statusCode = 400;
      next(error);
      return;
    }

    // Fill the row and burn the token
    const { error: updateError } = await supabase
      .from('depoimentos')
      .update({
        nome,
        texto,
        status: 'pendente',
        token: null,
        token_expires_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', row.id);

    if (updateError) {
      const error: ApiError = new Error('Erro ao salvar depoimento');
      error.statusCode = 500;
      next(error);
      return;
    }

    res.status(201).json({
      success: true,
      message: 'Depoimento enviado com sucesso'
    });
  } catch (error) {
    next(error);
  }
}

// Generate unique token for client (protected)
export async function gerarLinkDepoimento(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = randomUUID();
    const expira_em = new Date();
    expira_em.setDate(expira_em.getDate() + 30); // 30 days expiration

    // Placeholder row: nome/texto are NOT NULL, filled in when the client submits
    const { error } = await supabase
      .from('depoimentos')
      .insert([{
        nome: '',
        texto: '',
        status: 'aguardando',
        token,
        token_expires_at: expira_em.toISOString()
      }]);

    if (error) {
      const apiError: ApiError = new Error('Erro ao gerar link');
      apiError.statusCode = 500;
      next(apiError);
      return;
    }

    const linkDepoimento = `${process.env.FRONTEND_URL}/depoimento/${token}`;

    res.status(201).json({
      success: true,
      message: 'Link gerado com sucesso',
      token,
      linkDepoimento,
      expira_em
    });
  } catch (error) {
    next(error);
  }
}

// Get all testimonials with all statuses (protected)
export async function obterDepoimentosAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, limite = 20, pagina = 1 } = req.query;

    let query = supabase
      .from('depoimentos')
      .select('id, nome, texto, status, created_at, updated_at', { count: 'exact' })
      .neq('status', 'aguardando');

    if (status && status !== 'todos') {
      query = query.eq('status', status as string);
    }

    const offset = (Number(pagina) - 1) * Number(limite);
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limite) - 1);

    if (error) {
      const apiError: ApiError = new Error('Erro ao buscar depoimentos');
      apiError.statusCode = 500;
      next(apiError);
      return;
    }

    res.status(200).json({
      success: true,
      data: data || [],
      total: count || 0,
      pagina: Number(pagina),
      limite: Number(limite)
    });
  } catch (error) {
    next(error);
  }
}

// Approve/reject testimonial (protected)
export async function atualizarStatusDepoimento(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    if (!status || !['aprovado', 'rejeitado', 'pendente'].includes(status)) {
      const error: ApiError = new Error('Status inválido. Use: aprovado, rejeitado ou pendente');
      error.statusCode = 400;
      next(error);
      return;
    }

    const { error: updateError } = await supabase
      .from('depoimentos')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      const apiError: ApiError = new Error('Erro ao atualizar depoimento');
      apiError.statusCode = 500;
      next(apiError);
      return;
    }

    res.status(200).json({
      success: true,
      message: `Depoimento ${status} com sucesso`
    });
  } catch (error) {
    next(error);
  }
}
