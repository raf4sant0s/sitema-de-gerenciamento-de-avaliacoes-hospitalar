import { createApp } from './app';
import { env } from './config/env';

// Liga a API na porta definida no .env.
const app = createApp();

app.listen(env.PORT, () => {
  console.log(`API rodando em http://localhost:${env.PORT}`);
  console.log(`Documentação (Swagger) em http://localhost:${env.PORT}/api/docs`);
});
