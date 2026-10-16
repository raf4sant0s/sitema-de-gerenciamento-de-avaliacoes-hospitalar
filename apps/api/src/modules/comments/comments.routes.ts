import { Router } from 'express';
import { requireAuth, requireRole } from '../../shared/auth';
import { createCommentsController } from './comments.controller';
import type { CommentsService } from './comments.service';

// Rotas dos comentários anônimos (README, seção 9). Ficam em /api/comments e exigem login.
// Ver: todos os perfis, no próprio setor. Tratar/reabrir: super admin e admin do setor (RN16, RN17).
export function createCommentsRouter(service: CommentsService) {
  const router = Router();
  const controller = createCommentsController(service);

  /**
   * @openapi
   * components:
   *   schemas:
   *     Comment:
   *       type: object
   *       properties:
   *         id: { type: integer, example: 7 }
   *         sectorId: { type: integer, example: 1 }
   *         sectorName: { type: string, example: Pronto Atendimento }
   *         type: { type: string, nullable: true, enum: [ELOGIO, RECLAMACAO, SUGESTAO] }
   *         text: { type: string, example: A recepcionista foi muito atenciosa }
   *         status: { type: string, enum: [NEW, TREATED] }
   *         treatmentNote: { type: string, nullable: true }
   *         treatedBy: { type: object, nullable: true, properties: { id: { type: integer }, name: { type: string } } }
   *         treatedAt: { type: string, format: date-time, nullable: true }
   *         createdAt: { type: string, format: date-time }
   * /comments:
   *   get:
   *     summary: Lista os comentários (mais novos primeiro)
   *     description: Super admin vê todos (ou filtra por sectorId); os outros perfis, só os do seu setor.
   *     tags: [Comentários]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { in: query, name: sectorId, schema: { type: integer } }
   *       - { in: query, name: status, schema: { type: string, enum: [NEW, TREATED] } }
   *       - { in: query, name: type, schema: { type: string, enum: [ELOGIO, RECLAMACAO, SUGESTAO] } }
   *       - { in: query, name: from, schema: { type: string, example: "2026-10-01" }, description: "Data em que chegou (horário de Brasília)" }
   *       - { in: query, name: to, schema: { type: string, example: "2026-10-31" } }
   *       - { in: query, name: limit, schema: { type: integer, default: 50, maximum: 200 } }
   *       - { in: query, name: offset, schema: { type: integer, default: 0 } }
   *     responses:
   *       200:
   *         description: "{ items, total }"
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 items: { type: array, items: { $ref: '#/components/schemas/Comment' } }
   *                 total: { type: integer, example: 42 }
   *       400: { $ref: '#/components/responses/BadRequest' }
   *       401: { $ref: '#/components/responses/Unauthorized' }
   * /comments/{id}:
   *   patch:
   *     summary: Marca como tratado (com o que foi feito) ou reabre
   *     description: "status TREATED exige treatmentNote. status NEW reabre; a anotação continua guardada."
   *     tags: [Comentários]
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [status]
   *             properties:
   *               status: { type: string, enum: [NEW, TREATED] }
   *               treatmentNote: { type: string }
   *     responses:
   *       200: { description: Comentário alterado, content: { application/json: { schema: { $ref: '#/components/schemas/Comment' } } } }
   *       400: { description: "Tratado sem dizer o que foi feito (VALIDATION_ERROR)", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
   *       403: { description: "Visualizador ou setor de outra pessoa (FORBIDDEN)", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
   *       404: { description: "Não existe (COMMENT_NOT_FOUND)", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
   *       401: { $ref: '#/components/responses/Unauthorized' }
   */
  router.get('/', requireAuth, controller.list);
  router.patch('/:id', requireAuth, requireRole('SUPER_ADMIN', 'SECTOR_ADMIN'), controller.update);

  return router;
}
