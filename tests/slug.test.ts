import { describe, expect, it } from 'vitest';
import { gerarSlug, slugDisponivel } from '../src/utils/slug';

describe('gerarSlug', () => {
  it('remove acentos, pontuação e usa hífens', () => {
    expect(gerarSlug('Usucapião extrajudicial: como funciona')).toBe('usucapiao-extrajudicial-como-funciona');
    expect(gerarSlug('Ação de Família — Guarda Compartilhada!')).toBe('acao-de-familia-guarda-compartilhada');
  });

  it('nunca devolve slug vazio (título só com símbolos ou espaços)', () => {
    expect(gerarSlug('???')).toBe('artigo');
    expect(gerarSlug('   ---   ')).toBe('artigo');
    expect(gerarSlug('')).toBe('artigo');
  });

  it('limita a 80 caracteres e não termina em hífen', () => {
    const slug = gerarSlug('palavra '.repeat(40));
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith('-')).toBe(false);
    expect(slug.startsWith('palavra-palavra')).toBe(true);
  });
});

describe('slugDisponivel', () => {
  it('mantém o slug quando está livre', () => {
    expect(slugDisponivel('meu-artigo', [])).toBe('meu-artigo');
    expect(slugDisponivel('meu-artigo', ['outro'])).toBe('meu-artigo');
  });

  it('acrescenta -2, -3... quando já existe', () => {
    expect(slugDisponivel('meu-artigo', ['meu-artigo'])).toBe('meu-artigo-2');
    expect(slugDisponivel('meu-artigo', ['meu-artigo', 'meu-artigo-2'])).toBe('meu-artigo-3');
  });

  it('reserva "admin" porque colidiria com a rota /api/artigos/admin', () => {
    expect(slugDisponivel('admin', [])).toBe('admin-2');
  });
});
