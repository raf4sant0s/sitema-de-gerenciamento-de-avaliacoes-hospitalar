import { dateOnlySchema, idSchema, shiftSchema } from '@avaliacoes/schemas';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../shared/errors';
import type { SchedulesService } from './schedules.service';

const nameSchema = z.string().trim().min(1, 'Informe o nome da equipe').max(60, 'O nome pode ter até 60 caracteres');
const sectorIdQuery = z.coerce.number().pipe(idSchema).optional();

const teamsQuery = z.object({ sectorId: sectorIdQuery });
const createTeamBody = z.object({ sectorId: idSchema, name: nameSchema });
const updateTeamBody = z
  .strictObject({ name: nameSchema.optional(), active: z.boolean().optional() })
  .refine((body) => body.name !== undefined || body.active !== undefined, 'Nada para alterar');

const schedulesQuery = z.object({
  sectorId: sectorIdQuery,
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Informe o mês no formato AAAA-MM'),
});
const saveSchedulesBody = z.object({
  items: z
    .array(
      z.object({
        sectorId: idSchema,
        shiftDate: dateOnlySchema,
        shift: shiftSchema,
        teamId: idSchema.nullable(), // null = tirar a equipe desta célula
      }),
    )
    .max(200, 'Envie no máximo 200 células por vez'),
});

function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new AppError(400, 'VALIDATION_ERROR', result.error.issues[0].message);
  }
  return result.data;
}

function teamId(req: Request): number {
  const result = idSchema.safeParse(Number(req.params.id));
  if (!result.success) throw new AppError(404, 'TEAM_NOT_FOUND', 'Equipe não encontrada');
  return result.data;
}

// Lê o pedido, chama o service e devolve a resposta (README, seção 9).
export function createSchedulesController(service: SchedulesService) {
  return {
    async listTeams(req: Request, res: Response) {
      res.json(await service.listTeams(req.user!, parse(teamsQuery, req.query).sectorId));
    },
    async createTeam(req: Request, res: Response) {
      const body = parse(createTeamBody, req.body);
      res.status(201).json(await service.createTeam(req.user!, body.sectorId, body.name));
    },
    async updateTeam(req: Request, res: Response) {
      const id = teamId(req);
      res.json(await service.updateTeam(req.user!, id, parse(updateTeamBody, req.body)));
    },
    async deactivateTeam(req: Request, res: Response) {
      res.json(await service.deactivateTeam(req.user!, teamId(req)));
    },
    async listSchedules(req: Request, res: Response) {
      const query = parse(schedulesQuery, req.query);
      res.json(await service.listSchedules(req.user!, query.sectorId, query.month));
    },
    async saveSchedules(req: Request, res: Response) {
      res.json(await service.saveSchedules(req.user!, parse(saveSchedulesBody, req.body).items));
    },
  };
}
