import { Router } from 'express';
import { requireAuth, requireRole } from '../../shared/auth';
import { createUsersController } from './users.controller';
import type { UsersService } from './users.service';

// Rotas de usuários (README, seção 9). Ficam em /api/users.
// Super admin: todos os usuários. Admin de setor: só os visualizadores do seu setor. Visualizador: nenhuma.
export function createUsersRouter(service: UsersService) {
  const router = Router();
  const controller = createUsersController(service);

  router.use(requireAuth, requireRole('SUPER_ADMIN', 'SECTOR_ADMIN'));

  /**
   * @openapi
   * components:
   *   schemas:
   *     User:
   *       type: object
   *       properties:
   *         id: { type: integer, example: 2 }
   *         name: { type: string, example: Ana }
   *         email: { type: string, example: ana@hospital.com }
   *         role: { type: string, enum: [SUPER_ADMIN, SECTOR_ADMIN, VIEWER] }
   *         sectorId: { type: integer, nullable: true, example: 1 }
   *         active: { type: boolean, example: true }
   *         createdAt: { type: string, format: date-time }
   * /users:
   *   get:
   *     summary: Lista os usuários
   *     description: Super admin vê todos; admin de setor, só os visualizadores do seu setor.
   *     tags: [Usuários]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200: { description: Usuários, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/User' } } } } }
   *       403: { description: "Visualizador (FORBIDDEN)", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
   *       401: { $ref: '#/components/responses/Unauthorized' }
   *   post:
   *     summary: Cadastra um usuário
   *     description: Super admin cadastra qualquer perfil (super admin sem setor). Admin de setor só cadastra visualizadores do seu setor.
   *     tags: [Usuários]
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name, email, password, role]
   *             properties:
   *               name: { type: string }
   *               email: { type: string }
   *               password: { type: string, description: "Senha inicial, mínimo 8 caracteres" }
   *               role: { type: string, enum: [SUPER_ADMIN, SECTOR_ADMIN, VIEWER] }
   *               sectorId: { type: integer, nullable: true }
   *     responses:
   *       201: { description: Usuário criado, content: { application/json: { schema: { $ref: '#/components/schemas/User' } } } }
   *       400: { description: "Dado inválido ou setor faltando (VALIDATION_ERROR)", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
   *       403: { description: "Perfil ou setor não permitido (FORBIDDEN)", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
   *       404: { description: "Setor não existe (SECTOR_NOT_FOUND)", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
   *       409: { description: "E-mail já cadastrado (EMAIL_TAKEN)", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
   *       401: { $ref: '#/components/responses/Unauthorized' }
   */
  router.get('/', controller.list);
  router.post('/', controller.create);

  /**
   * @openapi
   * /users/{id}:
   *   put:
   *     summary: Altera um usuário (ou redefine a senha dele)
   *     description: Ninguém pode desativar a si mesmo nem mudar o próprio perfil ou setor.
   *     tags: [Usuários]
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name: { type: string }
   *               email: { type: string }
   *               password: { type: string, description: "Nova senha (redefinir)" }
   *               role: { type: string, enum: [SUPER_ADMIN, SECTOR_ADMIN, VIEWER] }
   *               sectorId: { type: integer, nullable: true }
   *               active: { type: boolean }
   *     responses:
   *       200: { description: Usuário alterado, content: { application/json: { schema: { $ref: '#/components/schemas/User' } } } }
   *       403: { description: "Sem permissão, ou tentou desativar/mudar a si mesmo (FORBIDDEN)", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
   *       400: { $ref: '#/components/responses/BadRequest' }
   *       404: { description: "Usuário não existe (USER_NOT_FOUND) ou setor não existe (SECTOR_NOT_FOUND)", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
   *       409: { description: "E-mail já cadastrado (EMAIL_TAKEN)", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
   *       401: { $ref: '#/components/responses/Unauthorized' }
   *   delete:
   *     summary: Desativa o usuário
   *     description: Não apaga; a pessoa deixa de conseguir entrar. Ninguém desativa a si mesmo.
   *     tags: [Usuários]
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
   *     responses:
   *       200: { description: Usuário desativado, content: { application/json: { schema: { $ref: '#/components/schemas/User' } } } }
   *       403: { description: "Sem permissão ou a própria conta (FORBIDDEN)", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
   *       404: { description: "Não existe (USER_NOT_FOUND)", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
   *       401: { $ref: '#/components/responses/Unauthorized' }
   */
  router.put('/:id', controller.update);
  router.delete('/:id', controller.deactivate);

  return router;
}
