import { describe, expect, it } from 'vitest';
import { proximoPublicadoEm } from '../src/utils/publicacao';

const AGORA = '2026-09-28T12:00:00.000Z';
const ANTES = '2026-09-01T09:00:00.000Z';

describe('proximoPublicadoEm', () => {
  it('grava a data na primeira publicação', () => {
    expect(proximoPublicadoEm(true, null, AGORA)).toBe(AGORA);
  });

  it('mantém a data original ao republicar', () => {
    expect(proximoPublicadoEm(true, ANTES, AGORA)).toBe(ANTES);
  });

  it('mantém a data original ao despublicar', () => {
    expect(proximoPublicadoEm(false, ANTES, AGORA)).toBe(ANTES);
  });

  it('rascunho que nunca foi publicado continua sem data', () => {
    expect(proximoPublicadoEm(false, null, AGORA)).toBeNull();
  });
});
