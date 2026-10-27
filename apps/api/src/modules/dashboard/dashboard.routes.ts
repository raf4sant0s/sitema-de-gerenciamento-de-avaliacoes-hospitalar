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

  /**
   * @openapi
   * /dashboard/report.pdf:
   *   get:
   *     summary: Baixa o relatório do setor num mês, em PDF (RN23)
   *     description: "Para imprimir: nota geral, respostas por carinha, nota por turno e por equipe (equipe com menos de 5 respostas: dados insuficientes, D4). Nenhum dado pessoal nem comentário. Super admin: qualquer setor. Admin de setor: só o próprio. Visualizador: 403."
   *     tags: [Dashboard]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { in: query, name: sectorId, required: true, schema: { type: integer, example: 1 } }
   *       - { in: query, name: month, required: true, schema: { type: string, example: "2026-10" }, description: "Mês no formato AAAA-MM" }
   *     responses:
   *       200:
   *         description: Arquivo .pdf
   *         content:
   *           application/pdf:
   *             schema: { type: string, format: binary }
   *       400: { $ref: '#/components/responses/DashBadRequest' }
   *       401: { $ref: '#/components/responses/DashUnauthorized' }
   *       403:
   *         description: "Visualizador, ou admin de setor pedindo outro setor (FORBIDDEN)"
   *         content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
   *       404:
   *         description: "Setor não existe (SECTOR_NOT_FOUND)"
   *         content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
   */
  router.get('/report.pdf', requireRole('SUPER_ADMIN', 'SECTOR_ADMIN'), controller.sectorReport);

  return router;
}

// TV Wall público (RN18, D5): fica em /api/public/tv e NÃO exige login.
// Só devolve percentuais de 0 a 100: nunca comentários, quantidades de respostas ou equipes.
export function createPublicTvRouter(service: DashboardService) {
  const router = Router();
  const controller = createDashboardController(service);

  /**
   * @openapi
   * /public/tv:
   *   get:
   *     summary: TV Wall, sem login (RN18)
   *     description: "Só percentuais inteiros de 0 a 100 (satisfeito = Bom ou Ótimo). Nunca comentários, número de respostas ou equipes (D5). Sem sectorId: hospital todo, comparando os setores; com sectorId: o setor, comparando os turnos."
   *     tags: [TV Wall (pública)]
   *     parameters:
   *       - $ref: '#/components/parameters/DashFrom'
   *       - $ref: '#/components/parameters/DashTo'
   *       - { in: query, name: sectorId, schema: { type: integer }, description: "Setor ativo. Sem ele: hospital todo" }
   *     responses:
   *       200:
   *         description: Percentuais do período
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 sectors:
   *                   type: array
   *                   description: Setores ativos, para o filtro da tela
   *                   items: { type: object, properties: { id: { type: integer, example: 1 }, name: { type: string, example: Pronto Atendimento } } }
   *                 overall:
   *                   type: object
   *                   nullable: true
   *                   description: "Avaliação geral. null quando não há nenhuma no período"
   *                   properties:
   *                     satisfied: { type: integer, example: 78, description: "% de Bom + Ótimo" }
   *                     distribution:
   *                       type: object
   *                       description: "% de cada carinha, de 1 (Péssimo) a 5 (Ótimo)"
   *                       example: { "1": 5, "2": 7, "3": 10, "4": 38, "5": 40 }
   *                 steps:
   *                   type: array
   *                   items: { type: object, properties: { step: { type: string, enum: [GERAL, RECEPCAO, TRIAGEM, ENFERMAGEM, MEDICO] }, satisfied: { type: integer, example: 81 } } }
   *                 breakdown:
   *                   type: object
   *                   properties:
   *                     by: { type: string, enum: [sector, shift] }
   *                     items:
   *                       type: array
   *                       items: { type: object, properties: { key: { type: string, example: "MANHA" }, label: { type: string, example: Manhã }, satisfied: { type: integer, example: 74 } } }
   *       400: { $ref: '#/components/responses/DashBadRequest' }
   *       404:
   *         description: "Setor não existe ou está inativo (SECTOR_NOT_FOUND)"
   *         content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
   */
  router.get('/public/tv', controller.publicTv);

  return router;
}
