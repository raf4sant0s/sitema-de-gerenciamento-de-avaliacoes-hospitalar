import { Router } from 'express';
import { requireAuth, requireRole } from '../../shared/auth';
import { createSectorsController } from './sectors.controller';
import type { SectorsService } from './sectors.service';

// Rotas de setores (README, seção 9). Ficam em /api/sectors e exigem login.
export function createSectorsRouter(service: SectorsService) {
  const router = Router();
  const controller = createSectorsController(service);

  router.use(requireAuth);

  /**
   * @openapi
   * components:
   *   schemas:
   *     Sector:
   *       type: object
   *       properties:
   *         id: { type: integer, example: 1 }
   *         name: { type: string, example: Pronto Atendimento }
   *         slug: { type: string, example: pronto-atendimento }
   *         code: { type: string, example: PA7K2Q }
   *         active: { type: boolean, example: true }
   *         createdAt: { type: string, format: date-time }
   *         surveyUrl: { type: string, example: "http://localhost:5173/pronto-atendimento" }
   *         shortUrl: { type: string, example: "http://localhost:5173/c/PA7K2Q" }
   * /sectors:
   *   get:
   *     summary: Lista os setores
   *     description: Super admin vê todos; admin de setor e visualizador, só o próprio (RN16).
   *     tags: [Setores]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Setores
   *         content:
   *           application/json:
   *             schema: { type: array, items: { $ref: '#/components/schemas/Sector' } }
   *       401: { $ref: '#/components/responses/Unauthorized' }
   *   post:
   *     summary: Cria um setor (só super admin)
   *     description: O código de 6 caracteres é gerado pela API. O link (slug) não muda depois.
   *     tags: [Setores]
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name, slug]
   *             properties:
   *               name: { type: string, example: Pronto Atendimento }
   *               slug: { type: string, example: pronto-atendimento }
   *     responses:
   *       201: { description: Setor criado, content: { application/json: { schema: { $ref: '#/components/schemas/Sector' } } } }
   *       400: { description: "Nome ou link inválido, ou link reservado (VALIDATION_ERROR)", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
   *       403: { description: "Não é super admin (FORBIDDEN)", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
   *       409: { description: "Link já usado por outro setor (SLUG_TAKEN)", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
   *       401: { $ref: '#/components/responses/Unauthorized' }
   */
  router.get('/', controller.list);
  router.post('/', requireRole('SUPER_ADMIN'), controller.create);

  /**
   * @openapi
   * /sectors/{id}:
   *   get:
   *     summary: Um setor
   *     tags: [Setores]
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
   *     responses:
   *       200: { description: Setor, content: { application/json: { schema: { $ref: '#/components/schemas/Sector' } } } }
   *       403: { description: "Setor de outra pessoa (FORBIDDEN)", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
   *       404: { description: "Não existe (SECTOR_NOT_FOUND)", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
   *       401: { $ref: '#/components/responses/Unauthorized' }
   *   put:
   *     summary: Edita nome e/ou situação (só super admin)
   *     description: O link (slug) e o código não podem mudar (decisão da dupla).
   *     tags: [Setores]
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
   *               active: { type: boolean }
   *     responses:
   *       200: { description: Setor alterado, content: { application/json: { schema: { $ref: '#/components/schemas/Sector' } } } }
   *       400: { description: "Campo inválido ou tentativa de mudar link/código (VALIDATION_ERROR)", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
   *       404: { description: "Não existe (SECTOR_NOT_FOUND)", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
   *       401: { $ref: '#/components/responses/Unauthorized' }
   *       403: { description: "Não é super admin (FORBIDDEN)", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
   *   delete:
   *     summary: Desativa o setor (só super admin)
   *     description: Não apaga nada; o setor fica inativo e a pesquisa dele para de abrir.
   *     tags: [Setores]
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
   *     responses:
   *       200: { description: Setor desativado, content: { application/json: { schema: { $ref: '#/components/schemas/Sector' } } } }
   *       404: { description: "Não existe (SECTOR_NOT_FOUND)", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
   *       401: { $ref: '#/components/responses/Unauthorized' }
   *       403: { description: "Não é super admin (FORBIDDEN)", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
   */
  router.get('/:id', controller.get);
  router.put('/:id', requireRole('SUPER_ADMIN'), controller.update);
  router.delete('/:id', requireRole('SUPER_ADMIN'), controller.deactivate);

  /**
   * @openapi
   * /sectors/{id}/qrcode:
   *   get:
   *     summary: Imagem PNG do QR Code do setor (RN01)
   *     description: Super admin e admin do próprio setor.
   *     tags: [Setores]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { in: path, name: id, required: true, schema: { type: integer } }
   *       - { in: query, name: type, schema: { type: string, enum: [slug, code], default: slug }, description: "slug = link pelo nome; code = link pelo código curto" }
   *     responses:
   *       200: { description: Imagem PNG, content: { image/png: {} } }
   *       403: { description: "Visualizador ou setor de outra pessoa (FORBIDDEN)", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
   *       404: { description: "Não existe (SECTOR_NOT_FOUND)", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
   *       400: { $ref: '#/components/responses/BadRequest' }
   *       401: { $ref: '#/components/responses/Unauthorized' }
   */
  router.get('/:id/qrcode', requireRole('SUPER_ADMIN', 'SECTOR_ADMIN'), controller.qrCode);

  return router;
}
