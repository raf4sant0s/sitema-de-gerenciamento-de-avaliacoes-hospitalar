import type { CommentStatus, CommentType } from '@avaliacoes/schemas';

// Um comentário com o que a tela precisa mostrar junto: setor e quem tratou.
// Nada que identifique o paciente (RN08).
export interface CommentRecord {
  id: number;
  sectorId: number;
  sectorName: string;
  type: CommentType | null;
  text: string;
  status: CommentStatus;
  treatmentNote: string | null;
  treatedBy: { id: number; name: string } | null;
  treatedAt: Date | null;
  createdAt: Date;
}

export interface CommentFilter {
  sectorId?: number;
  status?: CommentStatus;
  type?: CommentType;
  from?: string; // AAAA-MM-DD, pela data em que o comentário chegou (horário de Brasília)
  to?: string;
  limit: number;
  offset: number;
}

// Contrato de acesso aos comentários: O QUE dá para fazer, sem dizer qual banco é.
// A implementação com o Supabase está em ../supabase/comments.repository.ts.
export interface CommentsRepository {
  // Mais novos primeiro. total = quantos existem com esse filtro (para "carregar mais").
  list(filter: CommentFilter): Promise<{ items: CommentRecord[]; total: number }>;
  find(id: number): Promise<CommentRecord | null>;
  // RN17: marcar como tratado (com o que foi feito) ou reabrir.
  update(
    id: number,
    data: { status: CommentStatus; treatmentNote: string | null; treatedBy: number | null; treatedAt: Date | null },
  ): Promise<CommentRecord | null>;
}
