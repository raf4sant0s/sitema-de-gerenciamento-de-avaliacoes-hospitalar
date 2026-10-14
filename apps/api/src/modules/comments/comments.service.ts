import type { CommentStatus, CommentType } from '@avaliacoes/schemas';
import type { CommentRecord, CommentsRepository } from '../../database/repositories/comments.repository';
import { type AuthUser, assertSectorAccess } from '../../shared/auth';
import { AppError } from '../../shared/errors';

// O que a API devolve sobre um comentário (README, seção 9). Datas em texto ISO.
export interface CommentView extends Omit<CommentRecord, 'treatedAt' | 'createdAt'> {
  treatedAt: string | null;
  createdAt: string;
}

const toView = (record: CommentRecord): CommentView => ({
  ...record,
  treatedAt: record.treatedAt ? record.treatedAt.toISOString() : null,
  createdAt: record.createdAt.toISOString(),
});

export interface ListInput {
  sectorId?: number;
  status?: CommentStatus;
  type?: CommentType;
  from?: string;
  to?: string;
  limit: number;
  offset: number;
}

// Regras dos comentários anônimos (tarefa B15; RN11, RN16, RN17).
// - Ver: todos os perfis, só do próprio setor (o super admin vê todos).
// - Tratar: super admin e admin do setor.
// Decisões da dupla:
// - marcar como tratado exige escrever o que foi feito;
// - um comentário tratado pode ser reaberto (a anotação continua guardada).
export class CommentsService {
  constructor(
    private readonly comments: CommentsRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async list(me: AuthUser, input: ListInput): Promise<{ items: CommentView[]; total: number }> {
    const filter = { ...input };
    if (me.role !== 'SUPER_ADMIN') filter.sectorId = me.sectorId!;
    const { items, total } = await this.comments.list(filter);
    return { items: items.map(toView), total };
  }

  async update(me: AuthUser, id: number, input: { status: CommentStatus; treatmentNote?: string }): Promise<CommentView> {
    const comment = await this.comments.find(id);
    if (!comment) throw new AppError(404, 'COMMENT_NOT_FOUND', 'Comentário não encontrado');
    assertSectorAccess(me, comment.sectorId);

    if (input.status === 'TREATED') {
      // Decisão da dupla: só marca como tratado escrevendo o que foi feito.
      const note = input.treatmentNote?.trim();
      if (!note) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Escreva o que foi feito para marcar como tratado');
      }
      const updated = await this.comments.update(id, {
        status: 'TREATED',
        treatmentNote: note,
        treatedBy: me.id,
        treatedAt: this.now(),
      });
      return toView(updated!);
    }

    // Reabrir: volta para "novo"; a anotação anterior continua guardada (decisão da dupla).
    const reopened = await this.comments.update(id, {
      status: 'NEW',
      treatmentNote: comment.treatmentNote,
      treatedBy: null,
      treatedAt: null,
    });
    return toView(reopened!);
  }
}
