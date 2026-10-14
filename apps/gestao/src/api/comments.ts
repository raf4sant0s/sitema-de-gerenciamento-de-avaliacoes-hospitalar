import type { CommentStatus, CommentType } from '@avaliacoes/schemas';
import { api } from './client';

// Chamadas dos comentários anônimos para a API (README, seção 9; tarefa B15).

export interface Comment {
  id: number;
  sectorId: number;
  sectorName: string;
  type: CommentType | null;
  text: string;
  status: CommentStatus;
  treatmentNote: string | null;
  treatedBy: { id: number; name: string } | null;
  treatedAt: string | null;
  createdAt: string;
}

export interface CommentFilters {
  sectorId?: number;
  status?: CommentStatus;
  type?: CommentType;
  from?: string;
  to?: string;
}

export const typeLabels: Record<CommentType, string> = {
  ELOGIO: 'Elogio',
  RECLAMACAO: 'Reclamação',
  SUGESTAO: 'Sugestão',
};

export const statusLabels: Record<CommentStatus, string> = {
  NEW: 'Novo',
  TREATED: 'Tratado',
};

export const PAGE_SIZE = 50;

export function listComments(filters: CommentFilters, offset = 0): Promise<{ items: Comment[]; total: number }> {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  return api<{ items: Comment[]; total: number }>(`/comments?${params}`);
}

// RN17: marcar como tratado (com o que foi feito) ou reabrir (status NEW).
export function updateComment(id: number, status: CommentStatus, treatmentNote?: string): Promise<Comment> {
  return api<Comment>(`/comments/${id}`, { method: 'PATCH', body: JSON.stringify({ status, treatmentNote }) });
}
