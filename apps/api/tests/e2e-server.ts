// API só para os testes E2E (tarefa A18). NÃO é a API de verdade.
// Usa um PostgreSQL em memória (PGlite) com as migrations e os seeds de estrutura, para os testes
// nunca tocarem no banco compartilhado do Supabase. Some quando o teste termina.
// Quem liga este servidor é o Playwright (apps/pesquisa/playwright.config.ts).
import express from 'express';
import { createApp } from '../src/app';
import { SupabaseResponsesRepository } from '../src/database/supabase/responses.repository';
import { createTestDatabase, poolFrom } from './pglite';

const PORT = Number(process.env.E2E_API_PORT ?? 3399);

async function main() {
  const db = await createTestDatabase();
  const app = createApp({ responses: new SupabaseResponsesRepository(() => poolFrom(db)) });

  const server = express();

  // Só para os testes conferirem o que foi gravado (não existe na API de verdade).
  server.get('/e2e/responses', async (_req, res) => {
    const result = await db.query(
      `SELECT r.id, r.status, r.overall_score AS "overallScore",
              (SELECT COUNT(*)::int FROM answers a WHERE a.response_id = r.id) AS answers,
              c.type AS "commentType", c.text AS "commentText"
       FROM responses r
       LEFT JOIN comments c ON c.response_id = r.id
       ORDER BY r.created_at`,
    );
    res.json(result.rows);
  });

  server.use(app);
  server.listen(PORT, () => console.log(`API de teste (E2E) em http://localhost:${PORT}`));
}

main();
