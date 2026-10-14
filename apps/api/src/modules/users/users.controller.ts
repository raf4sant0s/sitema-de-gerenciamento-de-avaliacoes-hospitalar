import { idSchema, roleSchema } from '@avaliacoes/schemas';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../shared/errors';
import type { UsersService } from './users.service';

const nameSchema = z.string().trim().min(1, 'Informe o nome').max(100, 'O nome pode ter até 100 caracteres');
const emailSchema = z.string().trim().pipe(z.email('Informe um e-mail válido'));
export const passwordSchema = z
  .string()
  .min(8, 'A senha precisa ter pelo menos 8 caracteres')
  .max(72, 'A senha pode ter até 72 caracteres'); // limite do bcrypt

const createBody = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  role: roleSchema,
  sectorId: idSchema.nullish().transform((value) => value ?? null),
});

const updateBody = z
  .strictObject({
    name: nameSchema.optional(),
    email: emailSchema.optional(),
    password: passwordSchema.optional(),
    role: roleSchema.optional(),
    sectorId: idSchema.nullable().optional(),
    active: z.boolean().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, 'Nada para alterar');

function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new AppError(400, 'VALIDATION_ERROR', result.error.issues[0].message);
  }
  return result.data;
}

function userId(req: Request): number {
  const result = idSchema.safeParse(Number(req.params.id));
  if (!result.success) {
    throw new AppError(404, 'USER_NOT_FOUND', 'Usuário não encontrado');
  }
  return result.data;
}

// Lê o pedido, chama o service e devolve a resposta (README, seção 9).
export function createUsersController(service: UsersService) {
  return {
    async list(req: Request, res: Response) {
      res.json(await service.list(req.user!));
    },

    async create(req: Request, res: Response) {
      res.status(201).json(await service.create(req.user!, parse(createBody, req.body)));
    },

    async update(req: Request, res: Response) {
      const id = userId(req);
      res.json(await service.update(req.user!, id, parse(updateBody, req.body)));
    },

    async deactivate(req: Request, res: Response) {
      res.json(await service.deactivate(req.user!, userId(req)));
    },
  };
}
