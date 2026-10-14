import { dateOnlySchema, idSchema, shiftSchema } from '@avaliacoes/schemas';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../shared/errors';
import type { DashboardService } from './dashboard.service';

// Filtros na query (README, seção 9): from, to (AAAA-MM-DD), sectorId, shift, teamId. Todos opcionais.
const filtersQuery = z.object({
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
  sectorId: z.coerce.number().pipe(idSchema).optional(),
  shift: shiftSchema.optional(),
  teamId: z.coerce.number().pipe(idSchema).optional(),
});

const breakdownQuery = filtersQuery.extend({
  by: z.enum(['sector', 'shift', 'team'], 'Use by=sector, by=shift ou by=team'),
});

function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new AppError(400, 'VALIDATION_ERROR', result.error.issues[0].message);
  }
  return result.data;
}

// Lê o pedido, chama o service e devolve a resposta.
export function createDashboardController(service: DashboardService) {
  return {
    async summary(req: Request, res: Response) {
      res.json(await service.summary(req.user!, parse(filtersQuery, req.query)));
    },

    async questions(req: Request, res: Response) {
      res.json(await service.questions(req.user!, parse(filtersQuery, req.query)));
    },

    async steps(req: Request, res: Response) {
      res.json(await service.steps(req.user!, parse(filtersQuery, req.query)));
    },

    async breakdown(req: Request, res: Response) {
      const { by, ...filters } = parse(breakdownQuery, req.query);
      res.json(await service.breakdown(req.user!, by, filters));
    },

    async timeline(req: Request, res: Response) {
      res.json(await service.timeline(req.user!, parse(filtersQuery, req.query)));
    },
  };
}
