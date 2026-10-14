// Todas as chamadas deste site para a API passam por aqui.
// O endereço vem do .env (VITE_API_URL).
const API_URL = import.meta.env.VITE_API_URL;

// Erro no formato do contrato: { "error": { "code": "...", "message": "..." } } (README, seção 9)
export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      body?.error?.code ?? 'UNKNOWN',
      body?.error?.message ?? 'Não foi possível falar com a API.',
    );
  }

  return response.json() as Promise<T>;
}
