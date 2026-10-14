import type { Request, Response } from 'express';
import { z } from 'zod';
import type { UsersRepository } from '../../database/repositories/users.repository';
import { AppError } from '../../shared/errors';
import { passwordSchema } from '../users/users.controller';
import * as authService from './auth.service';

// O que o site precisa mandar para entrar.
const loginBodySchema = z.object({
  email: z.email('Informe um e-mail válido'),
  password: z.string().min(1, 'Informe a senha'),
});

const changePasswordBodySchema = z.object({
  currentPassword: z.string().min(1, 'Informe a senha atual'),
  newPassword: passwordSchema,
});

// Lê o pedido, chama o service e devolve a resposta (README, seção 9).
export function createAuthController(users: UsersRepository) {
  return {
    async login(req: Request, res: Response) {
      const body = loginBodySchema.safeParse(req.body);
      if (!body.success) {
        throw new AppError(400, 'VALIDATION_ERROR', body.error.issues[0].message);
      }

      const result = await authService.login(users, body.data.email, body.data.password);
      res.json(result);
    },

    async me(req: Request, res: Response) {
      // req.user foi preenchido pelo requireAuth
      const user = await authService.getCurrentUser(users, req.user!.id);
      res.json({ user });
    },

    async changePassword(req: Request, res: Response) {
      const body = changePasswordBodySchema.safeParse(req.body);
      if (!body.success) {
        throw new AppError(400, 'VALIDATION_ERROR', body.error.issues[0].message);
      }

      await authService.changePassword(users, req.user!.id, body.data.currentPassword, body.data.newPassword);
      res.json({ ok: true });
    },
  };
}
