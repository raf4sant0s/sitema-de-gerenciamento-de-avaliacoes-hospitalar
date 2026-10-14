import { Router } from 'express';
import { requireAuth, requireRole } from '../../shared/auth';
import { createDashboardController } from './dashboard.controller';
import type { DashboardService } from './dashboard.service';

// Rotas do dashboard (README, seção 9). Ficam em /api/dashboard e exigem login.
// Os três perfis podem ver; admin de setor e visualizador só o próprio setor (RN22).
export function createDashboardRouter(service: DashboardService) {
  const router = Router();
  const controller = createDashboardController(service);

  router.use(requireAuth);

  /**
   * @openapi
   * components:
   *   parameters:
   *     DashFrom: { in: query, name: from, schema: { type: string, format: date }, description: "Data do plantão inicial (AAAA-MM-DD)" }
   *     DashTo: { in: query, name: to, schema: { type: string, format: date }, description: "Data do plantão final (AAAA-MM-DD)" }
   *     DashSector: { in: query, name: sectorId, schema: { type: integer }, description: "Admin de setor e visualizador só o próprio (RN22)" }
   *     DashShift: { in: query, name: shift, schema: { type: string, enum: [MANHA, TARDE, NOITE] } }
   *     DashTeam: { in: query, name: teamId, schema: { type: integer } }
   *   responses:
   *     DashBadRequest:
   *       description: "Filtro em formato errado, ou data inicial depois da final (VALIDATION_ERROR)"
   *       content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
   *     DashUnauthorized:
   *       description: "Sem login, ou login vencido (UNAUTHORIZED)"
   *       content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
   *     DashForbidden:
   *       description: "Admin de setor ou visualizador pedindo outro setor (FORBIDDEN, RN22)"
   *       content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
   *
   * /dashboard/summary:
   *   get:
   *     summary: Nota geral e totais (RN20)
   *     description: Nota geral = média da pergunta obrigatória (1 a 5, 1 casa decimal) e quantas respostas em cada carinha.
   *     tags: [Dashboard]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - $ref: '#/components/parameters/DashFrom'
   *       - $ref: '#/components/parameters/DashTo'
   *       - $ref: '#/components/parameters/DashSector'
   *       - $ref: '#/components/parameters/DashShift'
   *       - $ref: '#/components/parameters/DashTeam'
   *     responses:
   *       200:
   *         description: Indicadores gerais
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 overallAverage: { type: number, nullable: true, example: 3.8 }
   *                 totalResponses: { type: integer, example: 160 }
   *                 complete: { type: integer, example: 127 }
   *                 partial: { type: integer, example: 4 }
   *                 abandoned: { type: integer, example: 29 }
   *                 distribution:
   *                   type: object
   *                   example: { "1": 1, "2": 10, "3": 36, "4": 49, "5": 31 }
   *       400: { $ref: '#/components/responses/DashBadRequest' }
   *       401: { $ref: '#/components/responses/DashUnauthorized' }
   *       403: { $ref: '#/components/responses/DashForbidden' }
   */
  router.get('/summary', controller.summary);

  /**
   * @openapi
   * /dashboard/questions:
   *   get:
   *     summary: Média de cada pergunta (RN21)
   *     description: Perguntas puladas não entram na média.
   *     tags: [Dashboard]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - $ref: '#/components/parameters/DashFrom'
   *       - $ref: '#/components/parameters/DashTo'
   *       - $ref: '#/components/parameters/DashSector'
   *       - $ref: '#/components/parameters/DashShift'
   *       - $ref: '#/components/parameters/DashTeam'
   *     responses:
   *       200:
   *         description: Uma linha por pergunta
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 properties:
   *                   questionId: { type: integer }
   *                   text: { type: string, example: Como foi o atendimento na recepção? }
   *                   step: { type: string, enum: [GERAL, RECEPCAO, TRIAGEM, ENFERMAGEM, MEDICO] }
   *                   average: { type: number, example: 3.2 }
   *                   count: { type: integer, example: 133 }
   *       400: { $ref: '#/components/responses/DashBadRequest' }
   *       401: { $ref: '#/components/responses/DashUnauthorized' }
   *       403: { $ref: '#/components/responses/DashForbidden' }
   */
  router.get('/questions', controller.questions);

  /**
   * @openapi
   * /dashboard/steps:
   *   get:
   *     summary: Média por etapa da jornada (RN21)
   *     tags: [Dashboard]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - $ref: '#/components/parameters/DashFrom'
   *       - $ref: '#/components/parameters/DashTo'
   *       - $ref: '#/components/parameters/DashSector'
   *       - $ref: '#/components/parameters/DashShift'
   *       - $ref: '#/components/parameters/DashTeam'
   *     responses:
   *       200:
   *         description: Na ordem da jornada (recepção, triagem, enfermagem, médico, geral)
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 properties:
   *                   step: { type: string, example: RECEPCAO }
   *                   average: { type: number, example: 3.2 }
   *                   count: { type: integer, example: 133 }
   *       400: { $ref: '#/components/responses/DashBadRequest' }
   *       401: { $ref: '#/components/responses/DashUnauthorized' }
   *       403: { $ref: '#/components/responses/DashForbidden' }
   */
  router.get('/steps', controller.steps);

  /**
   * @openapi
   * /dashboard/breakdown:
   *   get:
   *     summary: Nota geral por setor, turno ou equipe (RN15, RN22)
   *     description: Por equipe, com menos de 5 respostas com nota geral, a média vem null e insufficient true ("dados insuficientes").
   *     tags: [Dashboard]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { in: query, name: by, required: true, schema: { type: string, enum: [sector, shift, team] } }
   *       - $ref: '#/components/parameters/DashFrom'
   *       - $ref: '#/components/parameters/DashTo'
   *       - $ref: '#/components/parameters/DashSector'
   *       - $ref: '#/components/parameters/DashShift'
   *       - $ref: '#/components/parameters/DashTeam'
   *     responses:
   *       200:
   *         description: Uma linha por setor, turno ou equipe
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 properties:
   *                   key: { type: string, example: "1" }
   *                   label: { type: string, example: Equipe A · Pronto Atendimento }
   *                   average: { type: number, nullable: true, example: 3.6 }
   *                   count: { type: integer, example: 42 }
   *                   insufficient: { type: boolean, example: false }
   *       400:
   *         description: "Sem by, by diferente de sector/shift/team, ou filtro em formato errado (VALIDATION_ERROR)"
   *         content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
   *       401: { $ref: '#/components/responses/DashUnauthorized' }
   *       403: { $ref: '#/components/responses/DashForbidden' }
   */
  router.get('/breakdown', controller.breakdown);

  /**
   * @openapi
   * /dashboard/timeline:
   *   get:
   *     summary: Nota geral dia a dia (pela data do plantão)
   *     tags: [Dashboard]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - $ref: '#/components/parameters/DashFrom'
   *       - $ref: '#/components/parameters/DashTo'
   *       - $ref: '#/components/parameters/DashSector'
   *       - $ref: '#/components/parameters/DashShift'
   *       - $ref: '#/components/parameters/DashTeam'
   *     responses:
   *       200:
   *         description: Um ponto por dia com respostas
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 properties:
   *                   date: { type: string, format: date, example: "2026-10-14" }
   *                   average: { type: number, example: 3.8 }
   *                   count: { type: integer, example: 9 }
   *       400: { $ref: '#/components/responses/DashBadRequest' }
   *       401: { $ref: '#/components/responses/DashUnauthorized' }
   *       403: { $ref: '#/components/responses/DashForbidden' }
   */
  router.get('/timeline', controller.timeline);

  /**
   * @openapi
   * /dashboard/tv:
   *   get:
   *     summary: TV Wall (só super admin, RN18)
   *     description: Indicadores do hospital inteiro, nota por setor e todos os comentários (de todos os tipos e situações), dos mais recentes para os mais antigos, até 50 de uma vez.
   *     tags: [Dashboard]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - $ref: '#/components/parameters/DashFrom'
   *       - $ref: '#/components/parameters/DashTo'
   *     responses:
   *       200:
   *         description: Dados do TV Wall
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 summary: { type: object, description: "Mesmo formato do /dashboard/summary" }
   *                 sectors: { type: array, items: { type: object }, description: "Mesmo formato do /dashboard/breakdown?by=sector" }
   *                 comments:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id: { type: integer }
   *                       sectorId: { type: integer }
   *                       sectorName: { type: string, example: Pronto Atendimento }
   *                       type: { type: string, nullable: true, enum: [ELOGIO, RECLAMACAO, SUGESTAO] }
   *                       text: { type: string }
   *                       status: { type: string, enum: [NEW, TREATED] }
   *                       createdAt: { type: string, format: date-time }
   *                 totalComments: { type: integer, example: 67 }
   *       400: { $ref: '#/components/responses/DashBadRequest' }
   *       401: { $ref: '#/components/responses/DashUnauthorized' }
   *       403:
   *         description: "Não é super admin (FORBIDDEN, RN18)"
   *         content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
   */
  router.get('/tv', requireRole('SUPER_ADMIN'), controller.tv);

  /**
   * @openapi
   * /dashboard/export.xlsx:
   *   get:
   *     summary: Baixa as respostas em Excel, com os filtros do dashboard (RN19)
   *     description: Planilha com 3 abas (Respostas, Perguntas e Filtros). Nenhum dado pessoal (RN08). Admin de setor e visualizador só exportam o próprio setor (RN22).
   *     tags: [Dashboard]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - $ref: '#/components/parameters/DashFrom'
   *       - $ref: '#/components/parameters/DashTo'
   *       - $ref: '#/components/parameters/DashSector'
   *       - $ref: '#/components/parameters/DashShift'
   *       - $ref: '#/components/parameters/DashTeam'
   *     responses:
   *       200:
   *         description: Arquivo .xlsx
   *         content:
   *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
   *             schema: { type: string, format: binary }
   *       400: { $ref: '#/components/responses/DashBadRequest' }
   *       401: { $ref: '#/components/responses/DashUnauthorized' }
   *       403: { $ref: '#/components/responses/DashForbidden' }
   */
  router.get('/export.xlsx', controller.exportExcel);

  return router;
}
