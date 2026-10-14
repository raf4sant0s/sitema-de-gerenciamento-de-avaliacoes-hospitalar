import { Router } from 'express';
import { requireAuth, requireRole } from '../../shared/auth';
import { createSurveysController } from './surveys.controller';
import type { SurveysService } from './surveys.service';

// Rotas de pesquisas e perguntas (README, seção 9). Ficam em /api e exigem login de admin.
// Super admin: todos os setores. Admin de setor: só o próprio. Visualizador: nenhuma.
export function createSurveysRouter(service: SurveysService) {
  const router = Router();
  const controller = createSurveysController(service);
  const admins = [requireAuth, requireRole('SUPER_ADMIN', 'SECTOR_ADMIN')];

  /**
   * @openapi
   * components:
   *   schemas:
   *     Survey:
   *       type: object
   *       properties:
   *         id: { type: integer, example: 1 }
   *         sectorId: { type: integer, example: 1 }
   *         title: { type: string, example: Pesquisa do Pronto Atendimento }
   *         active: { type: boolean, example: false }
   *         createdAt: { type: string, format: date-time }
   *     Question:
   *       type: object
   *       properties:
   *         id: { type: integer, example: 3 }
   *         surveyId: { type: integer, example: 1 }
   *         position: { type: integer, example: 1 }
   *         text: { type: string, example: Como foi o atendimento na recepção? }
   *         step: { type: string, enum: [GERAL, RECEPCAO, TRIAGEM, ENFERMAGEM, MEDICO] }
   *         required: { type: boolean, example: false }
   *         active: { type: boolean, example: true }
   *         answerCount: { type: integer, example: 12 }
   * /surveys:
   *   get:
   *     summary: Lista as pesquisas (mais novas primeiro)
   *     description: Super admin vê todas (ou filtra por sectorId); admin de setor, só as do seu setor.
   *     tags: [Pesquisas]
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ in: query, name: sectorId, schema: { type: integer } }]
   *     responses:
   *       200: { description: Pesquisas, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Survey' } } } } }
   *   post:
   *     summary: Cria uma pesquisa (desativada, já com a pergunta obrigatória)
   *     tags: [Pesquisas]
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content: { application/json: { schema: { type: object, required: [sectorId, title], properties: { sectorId: { type: integer }, title: { type: string } } } } }
   *     responses:
   *       201: { description: Pesquisa criada, content: { application/json: { schema: { $ref: '#/components/schemas/Survey' } } } }
   *       403: { description: "Setor de outra pessoa (FORBIDDEN)" }
   *       404: { description: "Setor não existe (SECTOR_NOT_FOUND)" }
   */
  router.get('/surveys', ...admins, controller.list);
  router.post('/surveys', ...admins, controller.create);

  /**
   * @openapi
   * /surveys/{id}:
   *   get:
   *     summary: Uma pesquisa
   *     tags: [Pesquisas]
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
   *     responses:
   *       200: { description: Pesquisa, content: { application/json: { schema: { $ref: '#/components/schemas/Survey' } } } }
   *       404: { description: "Não existe (SURVEY_NOT_FOUND)" }
   *   put:
   *     summary: Muda o título e/ou ativa/desativa
   *     description: Ativar uma pesquisa desativa a que estava ativa no mesmo setor (RN02).
   *     tags: [Pesquisas]
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
   *     requestBody:
   *       required: true
   *       content: { application/json: { schema: { type: object, properties: { title: { type: string }, active: { type: boolean } } } } }
   *     responses:
   *       200: { description: Pesquisa alterada, content: { application/json: { schema: { $ref: '#/components/schemas/Survey' } } } }
   */
  router.get('/surveys/:id', ...admins, controller.get);
  router.put('/surveys/:id', ...admins, controller.update);

  /**
   * @openapi
   * /surveys/{id}/questions:
   *   get:
   *     summary: Perguntas da pesquisa (opcionais pela ordem, obrigatória por último)
   *     tags: [Pesquisas]
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
   *     responses:
   *       200: { description: Perguntas, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Question' } } } } }
   *   post:
   *     summary: Nova pergunta opcional (vai para o fim das opcionais)
   *     tags: [Pesquisas]
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
   *     requestBody:
   *       required: true
   *       content: { application/json: { schema: { type: object, required: [text, step], properties: { text: { type: string }, step: { type: string, enum: [GERAL, RECEPCAO, TRIAGEM, ENFERMAGEM, MEDICO] } } } } }
   *     responses:
   *       201: { description: Pergunta criada, content: { application/json: { schema: { $ref: '#/components/schemas/Question' } } } }
   * /surveys/{id}/questions/order:
   *   put:
   *     summary: Reordena as perguntas opcionais
   *     description: "Envie todas as opcionais da pesquisa, na nova ordem. A obrigatória fica sempre por último (RN05)."
   *     tags: [Pesquisas]
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
   *     requestBody:
   *       required: true
   *       content: { application/json: { schema: { type: object, required: [ids], properties: { ids: { type: array, items: { type: integer } } } } } }
   *     responses:
   *       200: { description: Perguntas na nova ordem, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Question' } } } } }
   *       400: { description: "Lista incompleta ou com pergunta de fora (VALIDATION_ERROR)" }
   */
  router.get('/surveys/:id/questions', ...admins, controller.listQuestions);
  router.post('/surveys/:id/questions', ...admins, controller.createQuestion);
  router.put('/surveys/:id/questions/order', ...admins, controller.reorder);

  /**
   * @openapi
   * /questions/{id}:
   *   put:
   *     summary: Muda texto, etapa ou situação de uma pergunta
   *     description: Na obrigatória, só o texto muda (REQUIRED_QUESTION_LOCKED).
   *     tags: [Pesquisas]
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
   *     requestBody:
   *       required: true
   *       content: { application/json: { schema: { type: object, properties: { text: { type: string }, step: { type: string }, active: { type: boolean } } } } }
   *     responses:
   *       200: { description: Pergunta alterada, content: { application/json: { schema: { $ref: '#/components/schemas/Question' } } } }
   *       400: { description: "Tentou desativar ou mudar a etapa da obrigatória (REQUIRED_QUESTION_LOCKED)" }
   *       404: { description: "Não existe (QUESTION_NOT_FOUND)" }
   *   delete:
   *     summary: Desativa a pergunta (as respostas antigas ficam guardadas)
   *     tags: [Pesquisas]
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
   *     responses:
   *       200: { description: Pergunta desativada, content: { application/json: { schema: { $ref: '#/components/schemas/Question' } } } }
   *       400: { description: "É a obrigatória (REQUIRED_QUESTION_LOCKED)" }
   */
  router.put('/questions/:id', ...admins, controller.updateQuestion);
  router.delete('/questions/:id', ...admins, controller.deactivateQuestion);

  return router;
}
