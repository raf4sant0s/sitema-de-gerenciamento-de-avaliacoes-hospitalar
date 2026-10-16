// API só para os testes E2E da gestão (tarefa B16). NÃO é a API de verdade.
// Usa um PostgreSQL em memória (PGlite) com as migrations e TODOS os dados de exemplo, inclusive
// um usuário de cada perfil com a senha de teste (gestao-database.ts). Some quando o teste termina.
// Quem liga este servidor é o Playwright (apps/gestao/playwright.config.ts).
import { createApp } from '../src/app';
import { createGestaoDatabase, repositoriesFor } from './gestao-database';

const PORT = Number(process.env.E2E_API_PORT ?? 3398);

async function main() {
  const db = await createGestaoDatabase();
  const app = createApp(repositoriesFor(db));
  app.listen(PORT, () => console.log(`API de teste da gestão (E2E) em http://localhost:${PORT}`));
}

main();
