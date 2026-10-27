import { idSchema, sectorSlugSchema } from '@avaliacoes/schemas';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../shared/errors';
import type { SectorsService } from './sectors.service';

const nameSchema = z.string().trim().min(1, 'Informe o nome do setor').max(100, 'O nome pode ter até 100 caracteres');

// Criar: nome + link (o site já manda o link gerado a partir do nome, e a pessoa pode ajustar).
const createBody = z.object({
  name: nameSchema,
  slug: sectorSlugSchema,
});

// Editar: só nome e situação. strictObject recusa campos a mais, como "slug",
// porque o link não pode mudar depois de criado (decisão da dupla).
const updateBody = z
  .strictObject({
    name: nameSchema.optional(),
    active: z.boolean().optional(),
  })
  .refine((body) => body.name !== undefined || body.active !== undefined, 'Nada para alterar');

function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new AppError(400, 'VALIDATION_ERROR', result.error.issues[0].message);
  }
  return result.data;
}

function sectorId(req: Request): number {
  const result = idSchema.safeParse(Number(req.params.id));
  if (!result.success) {
    throw new AppError(404, 'SECTOR_NOT_FOUND', 'Setor não encontrado');
  }
  return result.data;
}

// Lê o pedido, chama o service e devolve a resposta (README, seção 9).
export function createSectorsController(service: SectorsService) {
  return {
    async list(req: Request, res: Response) {
      res.json(await service.list(req.user!));
    },

    async get(req: Request, res: Response) {
      res.json(await service.get(req.user!, sectorId(req)));
    },

    async create(req: Request, res: Response) {
      const body = parse(createBody, req.body);
      res.status(201).json(await service.create(body.name, body.slug));
    },

    async update(req: Request, res: Response) {
      const id = sectorId(req);
      const body = parse(updateBody, req.body);
      res.json(await service.update(id, body));
    },

    async deactivate(req: Request, res: Response) {
      res.json(await service.deactivate(sectorId(req)));
    },

    async qrCode(req: Request, res: Response) {
      const { png, fileName } = await service.qrCode(req.user!, sectorId(req));
      res.type('png');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(png);
    },
  };
}
