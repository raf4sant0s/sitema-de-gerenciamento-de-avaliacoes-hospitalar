import { createApp } from './app';
import { env } from './config/env';
import { createRepositories } from './database';
import { startAbandonmentJob } from './modules/responses/abandonment';
import { ResponsesService } from './modules/responses/responses.service';

// Liga a API na porta definida no .env.
const app = createApp();

// RN10: a cada minuto, respostas paradas há 30 minutos viram ABANDONED (A12).
startAbandonmentJob(new ResponsesService(createRepositories().responses));

app.listen(env.PORT, () => {
  console.log(`API rodando em http://localhost:${env.PORT}`);
  console.log(`Documentação (Swagger) em http://localhost:${env.PORT}/api/docs`);
});
