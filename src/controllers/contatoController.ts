import { Request, Response, NextFunction } from 'express';
import { supabase } from '../services/supabase';
import { sendEmail } from '../services/email';
import { ApiError } from '../middleware/errorHandler';

// Email regex pattern for validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function enviarContato(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { nome, telefone, email, area_interesse, mensagem } = req.body;

    // Validate required fields
    if (!nome || !telefone || !email || !area_interesse || !mensagem) {
      const error: ApiError = new Error('Todos os campos são obrigatórios');
      error.statusCode = 400;
      next(error);
      return;
    }

    // Validate email format
    if (!emailRegex.test(email)) {
      const error: ApiError = new Error('Email inválido');
      error.statusCode = 400;
      next(error);
      return;
    }

    // Save to Supabase contatos table
    const { error: insertError } = await supabase
      .from('contatos')
      .insert([{
        nome,
        telefone,
        email,
        area_interesse,
        mensagem,
        criado_em: new Date().toISOString()
      }]);

    if (insertError) {
      const error: ApiError = new Error('Erro ao salvar contato');
      error.statusCode = 500;
      next(error);
      return;
    }

    // Send email to administrator
    const emailHtml = `
      <h2>Novo Contato Recebido</h2>
      <p><strong>Nome:</strong> ${nome}</p>
      <p><strong>Telefone:</strong> ${telefone}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Área de Interesse:</strong> ${area_interesse}</p>
      <p><strong>Mensagem:</strong></p>
      <p>${mensagem.replace(/\n/g, '<br>')}</p>
      <p><small>Enviado em: ${new Date().toLocaleString('pt-BR')}</small></p>
    `;

    try {
      await sendEmail('davidviannarj@yahoo.com.br', `Novo Contato - ${nome}`, emailHtml);
    } catch (emailError) {
      console.error('Erro ao enviar email:', emailError);
      // Don't fail the request if email fails, but log it
    }

    res.status(200).json({
      success: true,
      message: 'Contato enviado com sucesso'
    });
  } catch (error) {
    next(error);
  }
}
