import fs from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import type { Pool } from 'pg';

// Banco de teste: um PostgreSQL de verdade, mas em memória (PGlite).
// O banco compartilhado do Supabase nunca é tocado pelos testes.

const root = path.join(__dirname, '..', '..', '..');
const sqlFile = (...parts: string[]) => fs.readFileSync(path.join(root, ...parts), 'utf8');

// Cria o banco com a migration e os seeds de estrutura (setores, pesquisas, perguntas, equipes e escala).
export async function createTestDatabase(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(sqlFile('database', 'migrations', '001_cria_tabelas.sql'));
  await db.exec(sqlFile('database', 'seeds', '001_setores_e_pesquisas.sql'));
  await db.exec(sqlFile('database', 'seeds', '002_equipes_e_escala.sql'));
  return db;
}

// Faz o PGlite parecer o Pool da biblioteca pg (só o que os repositórios usam).
export function poolFrom(db: PGlite): Pool {
  const query = async (text: string, params?: unknown[]) => {
    const result = await db.query(text, params);
    return { ...result, rowCount: result.affectedRows ?? 0 }; // o pg chama de rowCount
  };
  return { query, connect: async () => ({ query, release: () => {} }) } as unknown as Pool;
}
