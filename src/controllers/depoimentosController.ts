import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../services/supabase';
import { ApiError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';

// Get public approved testimonials
export async function obterDepoimentos(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('depoimentos')
      .select('id, cliente_nome, depoimento, profissao, foto_url, criado_em')
      .eq('status', 'aprovado')
      .order('criado_em', { ascending: false });

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
    const { token, cliente_nome, depoimento, profissao, foto_url } = req.body;

    // Validate required fields
    if (!token || !cliente_nome || !depoimento) {
      const error: ApiError = new Error('Token, nome do cliente e depoimento são obrigatórios');
      error.statusCode = 400;
      next(error);
      return;
    }

    // Validate token from database
    const { data: tokenData, error: tokenError } = await supabase
      .from('tokens_depoimentos')
      .select('id, expira_em, usado')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      const error: ApiError = new Error('Token inválido');
      error.statusCode = 400;
      next(error);
      return;
    }

    // Check if token is already used
    if (tokenData.usado) {
      const error: ApiError = new Error('Token já foi utilizado');
      error.statusCode = 400;
      next(error);
      return;
    }

    // Check token expiration (30 days)
    const tokenExpiration = new Date(tokenData.expira_em);
    if (new Date() > tokenExpiration) {
      const error: ApiError = new Error('Token expirado');
      error.statusCode = 400;
      next(error);
      return;
    }

    // Save testimonial
    const { error: insertError } = await supabase
      .from('depoimentos')
      .insert([{
        cliente_nome,
        depoimento,
        profissao: profissao || null,
        foto_url: foto_url || null,
        status: 'pendente',
        criado_em: new Date().toISOString(),
        token_id: tokenData.id
      }]);

    if (insertError) {
      const error: ApiError = new Error('Erro ao salvar depoimento');
      error.statusCode = 500;
      next(error);
      return;
    }

    // Mark token as used
    await supabase
      .from('tokens_depoimentos')
      .update({ usado: true, usado_em: new Date().toISOString() })
      .eq('id', tokenData.id);

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
    const { cliente_email } = req.body;

    if (!cliente_email) {
      const error: ApiError = new Error('Email do cliente é obrigatório');
      error.statusCode = 400;
      next(error);
      return;
    }

    const token = uuidv4();
    const expira_em = new Date();
    expira_em.setDate(expira_em.getDate() + 30); // 30 days expiration

    const { data, error } = await supabase
      .from('tokens_depoimentos')
      .insert([{
        token,
        cliente_email,
        criado_por: req.user?.userId,
        criado_em: new Date().toISOString(),
        expira_em: expira_em.toISOString(),
        usado: false
      }])
      .select();

    if (error) {
      const apiError: ApiError = new Error('Erro ao gerar link');
      apiError.statusCode = 500;
      next(apiError);
      return;
    }

    // In a real scenario, you would send this link to the client via email
    const linkDepoimento = `${process.env.FRONTEND_URL}/depoimentos/submit?token=${token}`;

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
      .select('id, cliente_nome, depoimento, profissao, foto_url, status, criado_em', { count: 'exact' });

    if (status && status !== 'todos') {
      query = query.eq('status', status as string);
    }

    const offset = (Number(pagina) - 1) * Number(limite);
    const { data, error, count } = await query
      .order('criado_em', { ascending: false })
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
        atualizado_em: new Date().toISOString(),
        atualizado_por: req.user?.userId
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
