import { describe, expect, it } from 'vitest';
import { sanitizarHtml, textoDoHtml } from '../src/utils/sanitizar';

describe('sanitizarHtml', () => {
  it('mantém as tags permitidas', () => {
    const html =
      '<h2>Título</h2><p>Texto <strong>forte</strong> e <em>itálico</em></p><ul><li>a</li></ul><ol><li>b</li></ol><blockquote>q</blockquote>';
    expect(sanitizarHtml(html)).toBe(html);
  });

  it('remove <script> e <style> junto com o conteúdo', () => {
    expect(sanitizarHtml('<p>Oi</p><script>alert(1)</script>')).toBe('<p>Oi</p>');
    expect(sanitizarHtml('<style>p{color:red}</style><p>a</p>')).toBe('<p>a</p>');
  });

  it('remove manipuladores de evento e tags não permitidas', () => {
    expect(sanitizarHtml('<p onclick="x()">a</p><img src=x onerror=alert(1)>')).toBe('<p>a</p>');
    expect(sanitizarHtml('<div><span>oi</span></div>')).toBe('oi');
  });

  it('mantém link https, remove target/onclick e força rel seguro', () => {
    const saida = sanitizarHtml('<a href="https://exemplo.com" target="_blank" onclick="x()">site</a>');
    expect(saida).toBe('<a href="https://exemplo.com" rel="noopener noreferrer">site</a>');
  });

  it('aceita mailto', () => {
    expect(sanitizarHtml('<a href="mailto:a@b.com">m</a>')).toContain('href="mailto:a@b.com"');
  });

  it('descarta href com javascript:, data: e protocolo relativo', () => {
    expect(sanitizarHtml('<a href="javascript:alert(1)">x</a>')).not.toContain('javascript');
    expect(sanitizarHtml('<a href=" javascript:alert(1)">x</a>')).not.toContain('javascript');
    expect(sanitizarHtml('<a href="data:text/html;base64,AAAA">x</a>')).not.toContain('data:');
    expect(sanitizarHtml('<a href="//evil.com/x">x</a>')).not.toContain('evil.com');
  });

  it('preserva entidades de texto', () => {
    expect(sanitizarHtml('<p>Tom &amp; Jerry &lt;b&gt;</p>')).toBe('<p>Tom &amp; Jerry &lt;b&gt;</p>');
  });
});

describe('textoDoHtml', () => {
  it('devolve o texto sem tags', () => {
    expect(textoDoHtml('<p>Olá <strong>mundo</strong></p>')).toBe('Olá mundo');
  });

  it('devolve vazio quando não há texto visível', () => {
    expect(textoDoHtml('<p></p>')).toBe('');
    expect(textoDoHtml('<p>&nbsp;</p>')).toBe('');
    expect(textoDoHtml('<p><br></p>')).toBe('');
    expect(textoDoHtml('<script>x</script>')).toBe('');
  });
});
