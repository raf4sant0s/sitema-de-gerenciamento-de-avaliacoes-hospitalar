import type { Role } from '@avaliacoes/schemas';
import { api } from './client';

// Chamadas de usuários para a API (README, seção 9; tarefa B12).

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  sectorId: number | null;
  active: boolean;
  createdAt: string;
}

export interface NewUser {
  name: string;
  email: string;
  password: string;
  role: Role;
  sectorId: number | null;
}

export type UserChanges = Partial<NewUser> & { active?: boolean };

export function listUsers(): Promise<User[]> {
  return api<User[]>('/users');
}

export function createUser(data: NewUser): Promise<User> {
  return api<User>('/users', { method: 'POST', body: JSON.stringify(data) });
}

export function updateUser(id: number, changes: UserChanges): Promise<User> {
  return api<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(changes) });
}

// "Minha senha": a própria pessoa troca a senha (README, seção 9: PUT /auth/password).
export function changeMyPassword(currentPassword: string, newPassword: string): Promise<{ ok: true }> {
  return api<{ ok: true }>('/auth/password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) });
}
