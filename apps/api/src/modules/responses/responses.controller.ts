import type { Request, Response } from 'express';
import { z } from 'zod';
import { commentTypeSchema, faceValueSchema, idSchema } from '@avaliacoes/schemas';
import { AppError } from '../../shared/errors';
import type { ResponsesService } from './responses.service';

// Formato do que o site da pesquisa envia (README, seção 9).
const createResponseBody = z.object({
  sectorId: idSchema,
  surveyId: idSchema,
  questionId: idSchema,
  value: faceValueSchema, // RN04: carinha de 1 a 5
});

const answerBody = z.object({ value: faceValueSchema });

// RN11: texto livre obrigatório (se o paciente não escreve nada, o site não chama esta rota); tipo opcional.
const commentBody = z.object({
  type: commentTypeSchema.nullish(),
  text: z.string().trim().min(1, 'Escreva o comentário').max(2000, 'O comentário pode ter até 2000 caracteres'),
});

// Lê e confere um dado. Se estiver errado, responde 400 no formato padrão de erro.
function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new AppError(400, 'VALIDATION_ERROR', z.prettifyError(result.error));
  }
  return result.data;
}

// O id da resposta é um UUID. Qualquer outra coisa é uma resposta que não existe.
function responseId(req: Request): string {
  const result = z.uuid().safeParse(req.params.id);
  if (!result.success) {
    throw new AppError(404, 'RESPONSE_NOT_FOUND', 'Resposta não encontrada');
  }
  return result.data;
}

function questionId(req: Request): number {
  return parse(z.coerce.number().pipe(idSchema), req.params.questionId);
}

// Lê a requisição, chama o service e devolve a resposta.
export function createResponsesController(service: ResponsesService) {
  return {
    async getBySlug(req: Request, res: Response) {
      res.json(await service.getSurveyBySlug(String(req.params.slug)));
    },

    async create(req: Request, res: Response) {
      const body = parse(createResponseBody, req.body);
      const id = await service.createResponse(body);
      res.status(201).json({ id });
    },

    async saveAnswer(req: Request, res: Response) {
      const { value } = parse(answerBody, req.body);
      await service.saveAnswer(responseId(req), questionId(req), value);
      res.json({ ok: true });
    },

    async addComment(req: Request, res: Response) {
      const body = parse(commentBody, req.body);
      await service.addComment(responseId(req), body.type ?? null, body.text);
      res.status(201).json({ ok: true });
    },

    async complete(req: Request, res: Response) {
      await service.complete(responseId(req));
      res.json({ ok: true });
    },
  };
}
