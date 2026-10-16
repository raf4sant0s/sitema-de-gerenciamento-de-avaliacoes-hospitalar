import { Router } from 'express';
import { requireAuth, requireRole } from '../../shared/auth';
import { createSchedulesController } from './schedules.controller';
import type { SchedulesService } from './schedules.service';

// Rotas de equipes e escala (README, seção 9). Ficam em /api e exigem login.
// Ver: todos os perfis (no próprio setor). Alterar: super admin e admin do setor (RN16).
export function createSchedulesRouter(service: SchedulesService) {
  const router = Router();
  const controller = createSchedulesController(service);
  const admins = [requireAuth, requireRole('SUPER_ADMIN', 'SECTOR_ADMIN')];

  /**
   * @openapi
   * components:
   *   schemas:
   *     Team:
   *       type: object
   *       properties:
   *         id: { type: integer, example: 1 }
   *         sectorId: { type: integer, example: 1 }
   *         name: { type: string, example: Equipe A }
   *         active: { type: boolean, example: true }
   *     ScheduleItem:
   *       type: object
   *       properties:
   *         sectorId: { type: integer, example: 1 }
   *         shiftDate: { type: string, example: "2026-10-14", description: "Data do plantão (RN13)" }
   *         shift: { type: string, enum: [MANHA, TARDE, NOITE] }
   *         teamId: { type: integer, nullable: true, example: 1 }
   * /teams:
   *   get:
   *     summary: Lista as equipes (ativas e inativas)
   *     description: Super admin vê todas (ou filtra por sectorId); os outros perfis, as do seu setor.
   *     tags: [Escala]
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ in: query, name: sectorId, schema: { type: integer } }]
   *     responses:
   *       200: { description: Equipes, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Team' } } } } }
   *       400: { $ref: '#/components/responses/BadRequest' }
   *       401: { $ref: '#/components/responses/Unauthorized' }
   *   post:
   *     summary: Cria uma equipe (super admin e admin do setor)
   *     tags: [Escala]
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content: { application/json: { schema: { type: object, required: [sectorId, name], properties: { sectorId: { type: integer }, name: { type: string } } } } }
   *     responses:
   *       201: { description: Equipe criada, content: { application/json: { schema: { $ref: '#/components/schemas/Team' } } } }
   *       400: { $ref: '#/components/responses/BadRequest' }
   *       401: { $ref: '#/components/responses/Unauthorized' }
   *       403: { $ref: '#/components/responses/Forbidden' }
   *       404: { description: "Setor não existe (SECTOR_NOT_FOUND)", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
   * /teams/{id}:
   *   put:
   *     summary: Renomeia e/ou ativa/desativa a equipe
   *     tags: [Escala]
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
   *     requestBody:
   *       required: true
   *       content: { application/json: { schema: { type: object, properties: { name: { type: string }, active: { type: boolean } } } } }
   *     responses:
   *       200: { description: Equipe alterada, content: { application/json: { schema: { $ref: '#/components/schemas/Team' } } } }
   *       404: { description: "Não existe (TEAM_NOT_FOUND)", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
   *       400: { $ref: '#/components/responses/BadRequest' }
   *       401: { $ref: '#/components/responses/Unauthorized' }
   *       403: { $ref: '#/components/responses/Forbidden' }
   *   delete:
   *     summary: Desativa a equipe (não apaga; o histórico continua)
   *     tags: [Escala]
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
   *     responses:
   *       200: { description: Equipe desativada, content: { application/json: { schema: { $ref: '#/components/schemas/Team' } } } }
   *       401: { $ref: '#/components/responses/Unauthorized' }
   *       403: { $ref: '#/components/responses/Forbidden' }
   *       404: { description: "Não existe (TEAM_NOT_FOUND)", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
   */
  router.get('/teams', requireAuth, controller.listTeams);
  router.post('/teams', ...admins, controller.createTeam);
  router.put('/teams/:id', ...admins, controller.updateTeam);
  router.delete('/teams/:id', ...admins, controller.deactivateTeam);

  /**
   * @openapi
   * /schedules:
   *   get:
   *     summary: Escala de um setor num mês
   *     tags: [Escala]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { in: query, name: sectorId, schema: { type: integer }, description: "Obrigatório para o super admin" }
   *       - { in: query, name: month, required: true, schema: { type: string, example: "2026-10" } }
   *     responses:
   *       200: { description: Células da escala, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/ScheduleItem' } } } } }
   *       400: { description: "Mês em formato errado, ou super admin sem sectorId (VALIDATION_ERROR)", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
   *       401: { $ref: '#/components/responses/Unauthorized' }
   *   put:
   *     summary: Grava células da escala (cria, troca ou tira a equipe)
   *     description: "Também passa as respostas daquele setor, dia e turno para a equipe nova (decisão da dupla). teamId null tira a equipe da célula."
   *     tags: [Escala]
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content: { application/json: { schema: { type: object, required: [items], properties: { items: { type: array, items: { $ref: '#/components/schemas/ScheduleItem' } } } } } }
   *     responses:
   *       200: { description: "Gravado: { saved, responsesUpdated }" }
   *       400: { description: "Equipe de outro setor ou desativada (VALIDATION_ERROR)", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
   *       403: { description: "Setor de outra pessoa ou visualizador (FORBIDDEN)", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
   *       401: { $ref: '#/components/responses/Unauthorized' }
   */
  router.get('/schedules', requireAuth, controller.listSchedules);
  router.put('/schedules', ...admins, controller.saveSchedules);

  return router;
}
