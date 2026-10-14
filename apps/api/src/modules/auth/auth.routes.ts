import { Router } from 'express';
import type { UsersRepository } from '../../database/repositories/users.repository';
import { requireAuth } from '../../shared/auth';
import { createAuthController } from './auth.controller';

// Rotas de login (README, seção 9). Ficam em /api/auth.
export function createAuthRouter(users: UsersRepository) {
  const router = Router();
  const controller = createAuthController(users);

  /**
   * @openapi
   * /auth/login:
   *   post:
   *     summary: Entrar no site de gestão
   *     description: Confere e-mail e senha e devolve um token válido por 8 horas.
   *     tags: [Login]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password]
   *             properties:
   *               email: { type: string, example: admin@hospital.com }
   *               password: { type: string, example: minha-senha }
   *     responses:
   *       200:
   *         description: Login feito
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 token: { type: string }
   *                 user: { $ref: '#/components/schemas/AuthUser' }
   *       400: { description: "Corpo inválido (VALIDATION_ERROR)" }
   *       401: { description: "E-mail ou senha incorretos (INVALID_CREDENTIALS)" }
   */
  router.post('/login', controller.login);

  /**
   * @openapi
   * /auth/me:
   *   get:
   *     summary: Quem está logado
   *     tags: [Login]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Usuário logado
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 user: { $ref: '#/components/schemas/AuthUser' }
   *       401: { description: "Sem token, token inválido ou vencido (UNAUTHORIZED)" }
   */
  router.get('/me', requireAuth, controller.me);

  return router;
}
