import fs from 'node:fs';
import path from 'node:path';
import type { PGlite } from '@electric-sql/pglite';
import bcrypt from 'bcryptjs';
import type { Repositories } from '../src/database';
import { SupabaseCommentsRepository } from '../src/database/supabase/comments.repository';
import { SupabaseDashboardRepository } from '../src/database/supabase/dashboard.repository';
import { SupabaseResponsesRepository } from '../src/database/supabase/responses.repository';
import { SupabaseSchedulesRepository } from '../src/database/supabase/schedules.repository';
import { SupabaseSectorsRepository } from '../src/database/supabase/sectors.repository';
import { SupabaseSurveysRepository } from '../src/database/supabase/surveys.repository';
import { SupabaseUsersRepository } from '../src/database/supabase/users.repository';
import { TEST_PASSWORD } from './gestao-test-users';
import { createTestDatabase, poolFrom } from './pglite';

export { TEST_PASSWORD, TEST_USERS } from './gestao-test-users';

// Banco de teste da gestão (tarefa B16): um PostgreSQL em memória (PGlite) com TUDO que o banco
// de verdade tem depois do npm run db:seed: migrations, setores, pesquisas, equipes, escala,
// um usuário de cada perfil (RN16) e respostas com comentários.
// Usado pelos testes de integração da gestão e pela API de teste do E2E (e2e-gestao-server.ts).
// O banco compartilhado do Supabase nunca é tocado.

const seeds = path.join(__dirname, '..', '..', '..', 'database', 'seeds');

export async function createGestaoDatabase(): Promise<PGlite> {
  const db = await createTestDatabase(); // migrations + seeds 001 e 002 (da Estefanie)

  // Igual ao npm run db:seed: troca a marca pelo hash bcrypt da senha.
  // split/join em vez de replace: o hash tem "$", que o replace trataria como comando especial.
  const hash = await bcrypt.hash(TEST_PASSWORD, 10);
  const users = fs.readFileSync(path.join(seeds, '003_usuarios.sql'), 'utf8').split('{{SEED_PASSWORD_HASH}}').join(hash);
  await db.exec(users);

  // O seed 004 usa uma tabela temporária que some no fim da transação: roda dentro de uma.
  const responses = fs.readFileSync(path.join(seeds, '004_respostas_e_comentarios.sql'), 'utf8');
  await db.transaction(async (tx) => {
    await tx.exec(responses);
  });
  return db;
}

// Todos os repositórios de verdade (SQL), ligados ao banco em memória.
export function repositoriesFor(db: PGlite): Repositories {
  const pool = poolFrom(db);
  const getPool = () => pool;
  return {
    users: new SupabaseUsersRepository(getPool),
    sectors: new SupabaseSectorsRepository(getPool),
    surveys: new SupabaseSurveysRepository(getPool),
    schedules: new SupabaseSchedulesRepository(getPool),
    comments: new SupabaseCommentsRepository(getPool),
    responses: new SupabaseResponsesRepository(getPool),
    dashboard: new SupabaseDashboardRepository(getPool),
  };
}
