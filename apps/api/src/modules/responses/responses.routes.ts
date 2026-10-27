import { Router } from 'express';
import { SupabaseResponsesRepository } from '../../database/supabase/responses.repository';
import { createResponsesController } from './responses.controller';
import { ResponsesService } from './responses.service';

// Rotas públicas da pesquisa (README, seção 9). Sem login: o paciente é anônimo (RN08).
// Os testes passam outro service (com banco em memória); a API usa o padrão, com o Supabase.
export function createResponsesRouter(service = new ResponsesService(new SupabaseResponsesRepository())) {
  const router = Router();
  const controller = createResponsesController(service);

  /**
   * @openapi
   * components:
   *   schemas:
   *     PublicSurvey:
   *       type: object
   *       properties:
   *         sector:
   *           type: object
   *           properties:
   *             id: { type: integer, example: 1 }
   *             name: { type: string, example: Pronto Atendimento }
   *             slug: { type: string, example: pronto-atendimento }
   *         survey:
   *           type: object
   *           properties:
   *             id: { type: integer, example: 1 }
   *             questions:
   *               type: array
   *               description: Na ordem cadastrada, com a obrigatória sempre por último (RN02, RN05)
   *               items:
   *                 type: object
   *                 properties:
   *                   id: { type: integer, example: 3 }
   *                   position: { type: integer, example: 1 }
   *                   text: { type: string, example: Como foi o atendimento na recepção? }
   *                   step: { type: string, enum: [GERAL, RECEPCAO, TRIAGEM, ENFERMAGEM, MEDICO] }
   *                   required: { type: boolean, example: false }
   *     Error:
   *       type: object
   *       properties:
   *         error:
   *           type: object
   *           properties:
   *             code: { type: string, example: REQUIRED_MISSING }
   *             message: { type: string }
   *     Ok:
   *       type: object
   *       properties:
   *         ok: { type: boolean, example: true }
   *
   * /public/sectors/{slug}:
   *   get:
   *     summary: Pesquisa ativa de um setor, pelo link (RN01)
   *     tags: [Pesquisa (pública)]
   *     parameters:
   *       - { in: path, name: slug, required: true, schema: { type: string }, example: pronto-atendimento }
   *     responses:
   *       200:
   *         description: Setor e perguntas
   *         content: { application/json: { schema: { $ref: '#/components/schemas/PublicSurvey' } } }
   *       404:
   *         description: Setor inexistente, inativo ou sem pesquisa ativa
   *         content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
   */
  router.get('/public/sectors/:slug', controller.getBySlug);

  /**
   * @openapi
   * /public/responses:
   *   post:
   *     summary: Cria a resposta no primeiro toque numa carinha (RN09)
   *     description: Calcula sozinha o turno, a data do plantão (RN13) e a equipe da escala (RN14).
   *     tags: [Pesquisa (pública)]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [sectorId, surveyId, questionId, value]
   *             properties:
   *               sectorId: { type: integer, example: 1 }
   *               surveyId: { type: integer, example: 1 }
   *               questionId: { type: integer, example: 1 }
   *               value: { type: integer, minimum: 1, maximum: 5, example: 4 }
   *     responses:
   *       201:
   *         description: Resposta criada
   *         content:
   *           application/json:
   *             schema: { type: object, properties: { id: { type: string, format: uuid } } }
   *       400:
   *         description: Dados inválidos (ex. carinha fora de 1 a 5)
   *         content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
   *       404:
   *         description: Pergunta não pertence a esta pesquisa ou setor
   *         content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
   */
  router.post('/public/responses', controller.create);

  /**
   * @openapi
   * /public/responses/{id}/answers/{questionId}:
   *   put:
   *     summary: Salva (ou troca) a carinha de uma pergunta (RN09)
   *     tags: [Pesquisa (pública)]
   *     parameters:
   *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
   *       - { in: path, name: questionId, required: true, schema: { type: integer } }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [value]
   *             properties:
   *               value: { type: integer, minimum: 1, maximum: 5, example: 5 }
   *     responses:
   *       200: { description: Salvo, content: { application/json: { schema: { $ref: '#/components/schemas/Ok' } } } }
   *       400: { description: Dados inválidos, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
   *       404: { description: Resposta ou pergunta não encontrada, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
   *       409: { description: A resposta não está mais em andamento (PARTIAL), content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
   */
  router.put('/public/responses/:id/answers/:questionId', controller.saveAnswer);

  /**
   * @openapi
   * /public/responses/{id}/comment:
   *   post:
   *     summary: Salva o comentário anônimo opcional (RN11)
   *     tags: [Pesquisa (pública)]
   *     parameters:
   *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [text]
   *             properties:
   *               type: { type: string, enum: [ELOGIO, RECLAMACAO, SUGESTAO], nullable: true }
   *               text: { type: string, maxLength: 2000, example: Esperei muito na recepção. }
   *     responses:
   *       201: { description: Comentário salvo, content: { application/json: { schema: { $ref: '#/components/schemas/Ok' } } } }
   *       400: { description: Texto vazio ou tipo inválido, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
   *       404: { description: Resposta não encontrada, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
   *       409: { description: Resposta encerrada ou já tem comentário, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
   */
  router.post('/public/responses/:id/comment', controller.addComment);

  /**
   * @openapi
   * /public/responses/{id}/complete:
   *   post:
   *     summary: Termina a resposta na tela de agradecimento (RN10)
   *     tags: [Pesquisa (pública)]
   *     parameters:
   *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
   *     responses:
   *       200: { description: Resposta COMPLETE, content: { application/json: { schema: { $ref: '#/components/schemas/Ok' } } } }
   *       400: { description: "REQUIRED_MISSING: a pergunta obrigatória não foi respondida (RN05)", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
   *       404: { description: Resposta não encontrada, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
   *       409: { description: Resposta abandonada, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
   */
  router.post('/public/responses/:id/complete', controller.complete);

  return router;
}
