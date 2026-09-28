import { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  statusCode?: number;
  details?: any;
}

export function errorHandler(err: ApiError, req: Request, res: Response, next: NextFunction): void {
  const statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // body-parser errors carry English messages: translate them
  const tipo = (err as any).type;
  if (tipo === 'entity.too.large') message = 'O conteúdo enviado é grande demais.';
  else if (tipo === 'entity.parse.failed') message = 'Os dados enviados estão em um formato inválido.';

  console.error(`[${statusCode}] ${message}`, err.details || err);

  res.status(statusCode).json({
    error: message,
    statusCode,
    ...(process.env.NODE_ENV === 'development' && { details: err.details || err.stack })
  });
}
