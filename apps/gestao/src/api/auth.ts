import type { AuthUser, Session } from '../auth/session';
import { api } from './client';

// Chamadas de login para a API (README, seção 9: módulo auth).

export function login(email: string, password: string): Promise<Session> {
  return api<Session>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function me(): Promise<AuthUser> {
  const result = await api<{ user: AuthUser }>('/auth/me');
  return result.user;
}
