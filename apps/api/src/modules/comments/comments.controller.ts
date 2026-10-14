import { commentStatusSchema, commentTypeSchema, dateOnlySchema, idSchema } from '@avaliacoes/schemas';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../shared/errors';
import type { CommentsService } from './comments.service';

const listQuery = z.object({
  sectorId: z.coerce.number().pipe(idSchema).optional(),
  status: commentStatusSchema.optional(),
  type: commentTypeSchema.optional(),
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const updateBody = z.strictObject({
  status: commentStatusSchema,
  treatmentNote: z.string().max(2000, 'A anotação pode ter até 2000 caracteres').optional(),
});

function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new AppError(400, 'VALIDATION_ERROR', result.error.issues[0].message);
  }
  return result.data;
}

function commentId(req: Request): number {
  const result = idSchema.safeParse(Number(req.params.id));
  if (!result.success) throw new AppError(404, 'COMMENT_NOT_FOUND', 'Comentário não encontrado');
  return result.data;
}

// Lê o pedido, chama o service e devolve a resposta (README, seção 9).
export function createCommentsController(service: CommentsService) {
  return {
    async list(req: Request, res: Response) {
      res.json(await service.list(req.user!, parse(listQuery, req.query)));
    },
    async update(req: Request, res: Response) {
      const id = commentId(req);
      res.json(await service.update(req.user!, id, parse(updateBody, req.body)));
    },
  };
}
