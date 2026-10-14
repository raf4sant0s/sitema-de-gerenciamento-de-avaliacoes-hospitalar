import { idSchema, journeyStepSchema } from '@avaliacoes/schemas';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../shared/errors';
import type { SurveysService } from './surveys.service';

const titleSchema = z.string().trim().min(1, 'Informe o título da pesquisa').max(120, 'O título pode ter até 120 caracteres');
const textSchema = z.string().trim().min(1, 'Escreva a pergunta').max(200, 'A pergunta pode ter até 200 caracteres');

const listQuery = z.object({ sectorId: z.coerce.number().pipe(idSchema).optional() });
const createSurveyBody = z.object({ sectorId: idSchema, title: titleSchema });
const updateSurveyBody = z
  .strictObject({ title: titleSchema.optional(), active: z.boolean().optional() })
  .refine((body) => body.title !== undefined || body.active !== undefined, 'Nada para alterar');
const createQuestionBody = z.object({ text: textSchema, step: journeyStepSchema });
const updateQuestionBody = z
  .strictObject({ text: textSchema.optional(), step: journeyStepSchema.optional(), active: z.boolean().optional() })
  .refine((body) => Object.keys(body).length > 0, 'Nada para alterar');
const orderBody = z.object({ ids: z.array(idSchema) });

function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new AppError(400, 'VALIDATION_ERROR', result.error.issues[0].message);
  }
  return result.data;
}

function id(req: Request, code: string, message: string): number {
  const result = idSchema.safeParse(Number(req.params.id));
  if (!result.success) throw new AppError(404, code, message);
  return result.data;
}
const surveyId = (req: Request) => id(req, 'SURVEY_NOT_FOUND', 'Pesquisa não encontrada');
const questionId = (req: Request) => id(req, 'QUESTION_NOT_FOUND', 'Pergunta não encontrada');

// Lê o pedido, chama o service e devolve a resposta (README, seção 9).
export function createSurveysController(service: SurveysService) {
  return {
    async list(req: Request, res: Response) {
      const { sectorId } = parse(listQuery, req.query);
      res.json(await service.list(req.user!, sectorId));
    },
    async get(req: Request, res: Response) {
      res.json(await service.get(req.user!, surveyId(req)));
    },
    async create(req: Request, res: Response) {
      const body = parse(createSurveyBody, req.body);
      res.status(201).json(await service.create(req.user!, body.sectorId, body.title));
    },
    async update(req: Request, res: Response) {
      const target = surveyId(req);
      res.json(await service.update(req.user!, target, parse(updateSurveyBody, req.body)));
    },
    async listQuestions(req: Request, res: Response) {
      res.json(await service.listQuestions(req.user!, surveyId(req)));
    },
    async createQuestion(req: Request, res: Response) {
      const target = surveyId(req);
      res.status(201).json(await service.createQuestion(req.user!, target, parse(createQuestionBody, req.body)));
    },
    async reorder(req: Request, res: Response) {
      const target = surveyId(req);
      res.json(await service.reorder(req.user!, target, parse(orderBody, req.body).ids));
    },
    async updateQuestion(req: Request, res: Response) {
      const target = questionId(req);
      res.json(await service.updateQuestion(req.user!, target, parse(updateQuestionBody, req.body)));
    },
    async deactivateQuestion(req: Request, res: Response) {
      res.json(await service.deactivateQuestion(req.user!, questionId(req)));
    },
  };
}
