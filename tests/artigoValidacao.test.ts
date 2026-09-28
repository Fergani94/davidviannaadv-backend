import { beforeAll, describe, expect, it } from 'vitest';
import { ErroValidacao, LIMITE_RESUMO, LIMITE_TITULO, validarArtigo } from '../src/utils/artigoValidacao';

const BASE = 'https://projeto.supabase.co';
const CAPA_OK = `${BASE}/storage/v1/object/public/artigos-capas/abc.png`;

const valido = () => ({
  titulo: '  Meu artigo  ',
  resumo: '  Um resumo curto.  ',
  conteudo: '<p>Texto do artigo.</p>',
  capa_url: null,
  published: false,
});

beforeAll(() => {
  process.env.SUPABASE_URL = `${BASE}/`;
});

describe('validarArtigo', () => {
  it('aceita um artigo válido e apara os espaços', () => {
    expect(validarArtigo(valido())).toEqual({
      titulo: 'Meu artigo',
      resumo: 'Um resumo curto.',
      conteudo: '<p>Texto do artigo.</p>',
      capa_url: null,
      published: false,
    });
  });

  it('filtra o HTML do conteúdo', () => {
    const r = validarArtigo({ ...valido(), conteudo: '<p>Oi</p><script>alert(1)</script>' });
    expect(r.conteudo).toBe('<p>Oi</p>');
  });

  it('recusa título ausente, vazio, só espaços, não texto ou grande demais', () => {
    for (const titulo of [undefined, '', '   ', 123]) {
      expect(() => validarArtigo({ ...valido(), titulo })).toThrow(ErroValidacao);
    }
    expect(() => validarArtigo({ ...valido(), titulo: 'a'.repeat(LIMITE_TITULO + 1) })).toThrow(/no máximo 200/);
  });

  it('recusa resumo ausente, vazio ou grande demais', () => {
    expect(() => validarArtigo({ ...valido(), resumo: '' })).toThrow(/resumo/i);
    expect(() => validarArtigo({ ...valido(), resumo: 'a'.repeat(LIMITE_RESUMO + 1) })).toThrow(/no máximo 300/);
  });

  it('recusa conteúdo que fica vazio depois do filtro', () => {
    for (const conteudo of ['', '<p></p>', '<p>&nbsp;</p>', '<script>alert(1)</script>', undefined]) {
      expect(() => validarArtigo({ ...valido(), conteudo })).toThrow(/texto do artigo/i);
    }
  });

  it('só aceita capa hospedada no bucket artigos-capas do próprio projeto', () => {
    expect(validarArtigo({ ...valido(), capa_url: CAPA_OK }).capa_url).toBe(CAPA_OK);
    expect(() => validarArtigo({ ...valido(), capa_url: 'https://evil.com/x.png' })).toThrow(/capa/i);
    expect(() =>
      validarArtigo({ ...valido(), capa_url: `${BASE}/storage/v1/object/public/outro-bucket/x.png` })
    ).toThrow(/capa/i);
  });

  it('trata capa vazia ou ausente como sem capa', () => {
    expect(validarArtigo({ ...valido(), capa_url: '' }).capa_url).toBeNull();
    expect(validarArtigo({ ...valido(), capa_url: undefined }).capa_url).toBeNull();
  });

  it('published só é true quando vem exatamente true', () => {
    expect(validarArtigo({ ...valido(), published: true }).published).toBe(true);
    expect(validarArtigo({ ...valido(), published: 'true' }).published).toBe(false);
    expect(validarArtigo({ ...valido(), published: undefined }).published).toBe(false);
  });

  it('recusa corpo ausente', () => {
    expect(() => validarArtigo(undefined)).toThrow(ErroValidacao);
    expect(() => validarArtigo(null)).toThrow(ErroValidacao);
  });
});
