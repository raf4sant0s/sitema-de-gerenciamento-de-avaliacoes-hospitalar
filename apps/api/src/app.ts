import cors from 'cors';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { createRepositories, type Repositories } from './database';
import { createAuthRouter } from './modules/auth/auth.routes';
import { createCommentsRouter } from './modules/comments/comments.routes';
import { CommentsService } from './modules/comments/comments.service';
import { createDashboardRouter } from './modules/dashboard/dashboard.routes';
import { DashboardService } from './modules/dashboard/dashboard.service';
import { createResponsesRouter } from './modules/responses/responses.routes';
import { ResponsesService } from './modules/responses/responses.service';
import { createSchedulesRouter } from './modules/schedules/schedules.routes';
import { SchedulesService } from './modules/schedules/schedules.service';
import { createSectorsRouter } from './modules/sectors/sectors.routes';
import { SectorsService } from './modules/sectors/sectors.service';
import { createSurveysRouter } from './modules/surveys/surveys.routes';
import { SurveysService } from './modules/surveys/surveys.service';
import { createUsersRouter } from './modules/users/users.routes';
import { UsersService } from './modules/users/users.service';
import { errorHandler, notFoundHandler } from './shared/errors';
import { swaggerSpec } from './shared/swagger';

// Monta a API. Fica separado do server.ts para os testes poderem usar a API sem ligar o servidor.
// Os repositórios (acesso ao banco) podem ser trocados: os testes passam só os que querem
// "de mentira" (ex.: createApp({ sectors: falso })); os outros usam o banco real (database/index.ts).
export function createApp(overrides: Partial<Repositories> = {}) {
  const repositories: Repositories = { ...createRepositories(), ...overrides };
  const app = express();

  // Só os dois sites do projeto podem chamar a API.
  app.use(cors({ origin: env.CORS_ORIGINS }));
  // Permite ler o corpo das requisições em JSON.
  app.use(express.json());

  // Documentação interativa da API.
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  /**
   * @openapi
   * /health:
   *   get:
   *     summary: Confere se a API está no ar
   *     tags: [Sistema]
   *     responses:
   *       200:
   *         description: API funcionando
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: ok
   */
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Rotas dos módulos (README, seção 9).
  app.use('/api/auth', createAuthRouter(repositories.users)); // login e perfis (B9)
  app.use('/api/sectors', createSectorsRouter(new SectorsService(repositories.sectors, env.SURVEY_SITE_URL))); // setores e QR Code (B11)
  app.use('/api/users', createUsersRouter(new UsersService(repositories.users, repositories.sectors))); // usuários (B12)
  app.use('/api', createSurveysRouter(new SurveysService(repositories.surveys, repositories.sectors))); // pesquisas e perguntas (B13)
  app.use('/api/dashboard', createDashboardRouter(new DashboardService(repositories.dashboard))); // indicadores (A13)
  app.use('/api/comments', createCommentsRouter(new CommentsService(repositories.comments))); // comentários (B15)
  app.use('/api', createSchedulesRouter(new SchedulesService(repositories.schedules, repositories.sectors))); // equipes e escala (B14)
  app.use('/api', createResponsesRouter(new ResponsesService(repositories.responses))); // pesquisa do paciente, pública (A10)

  // Estes dois ficam sempre por último: rota inexistente e tratamento de erros.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
