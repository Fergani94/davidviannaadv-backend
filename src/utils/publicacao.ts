export function proximoPublicadoEm(publicar: boolean, atual: string | null, agora: string): string | null {
  if (publicar && !atual) return agora;
  return atual;
}
