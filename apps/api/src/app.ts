import cors from 'cors';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { createRepositories, type Repositories } from './database';
import { createAuthRouter } from './modules/auth/auth.routes';
import { createResponsesRouter } from './modules/responses/responses.routes';
import { errorHandler, notFoundHandler } from './shared/errors';
import { swaggerSpec } from './shared/swagger';

// Monta a API. Fica separado do server.ts para os testes poderem usar a API sem ligar o servidor.
// Os repositórios (acesso ao banco) podem ser trocados: os testes passam uns "de mentira",
// sem banco de verdade. Sem nada, a API usa o banco real (database/index.ts).
export function createApp(repositories: Repositories = createRepositories()) {
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
  app.use('/api', createResponsesRouter()); // pesquisa do paciente, pública (A10)

  // Estes dois ficam sempre por último: rota inexistente e tratamento de erros.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
