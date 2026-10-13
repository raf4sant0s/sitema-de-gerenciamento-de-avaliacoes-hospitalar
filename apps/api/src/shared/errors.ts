import type { ErrorRequestHandler, RequestHandler } from 'express';

// Erro "conhecido" da API: quem lança escolhe o status HTTP, um código e uma mensagem.
// Exemplo: throw new AppError(400, 'REQUIRED_MISSING', 'A pergunta obrigatória não foi respondida');
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Rota que não existe → 404 no formato padrão.
export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new AppError(404, 'NOT_FOUND', 'Rota não encontrada'));
};

// Todo erro da API sai no formato do README (seção 9):
// { "error": { "code": "...", "message": "..." } }
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }

  // Erro inesperado: mostra o detalhe só no terminal, nunca para quem chamou a API.
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' } });
};
