import { clearSession, loadSession } from '../auth/session';

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
  // Se houver alguém logado, manda o token junto (Authorization: Bearer <token>).
  const token = loadSession()?.token;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    // Login vencido (8 horas) ou usuário desativado: limpa o login e volta para a tela de entrar.
    if (response.status === 401 && token) {
      clearSession();
      window.location.assign('/login');
    }

    throw new ApiError(
      response.status,
      body?.error?.code ?? 'UNKNOWN',
      body?.error?.message ?? 'Não foi possível falar com a API.',
    );
  }

  return response.json() as Promise<T>;
}
