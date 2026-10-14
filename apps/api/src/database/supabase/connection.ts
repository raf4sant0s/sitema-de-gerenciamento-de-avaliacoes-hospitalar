import { Pool, types } from 'pg';
import { env } from '../../config/env';

// Colunas DATE (ex.: shift_date, a data do plantão) chegam como texto "AAAA-MM-DD".
// Sem isso, o pg transforma em data do JavaScript à meia-noite do fuso do computador,
// e o dia pode "voltar" um dia (RN13). 1082 é o código do tipo DATE no PostgreSQL.
types.setTypeParser(1082, (value) => value);

// Conexão com o banco PostgreSQL do Supabase, usando SQL puro pela biblioteca pg.
// É o único lugar da API que sabe onde o banco está. Para trocar de banco no futuro,
// basta apontar o DATABASE_URL para outro PostgreSQL (ou criar uma pasta irmã de supabase/).

let pool: Pool | undefined;

// Devolve o "pool": um grupo de conexões abertas que a API reaproveita a cada consulta,
// em vez de abrir uma conexão nova toda vez.
export function getPool(): Pool {
  if (!env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL não está no arquivo apps/api/.env. Peça o endereço do banco à Rafaela (por mensagem privada).',
    );
  }

  if (!pool) {
    pool = new Pool({
      connectionString: env.DATABASE_URL,
      // O Supabase só aceita conexões criptografadas (SSL).
      // rejectUnauthorized: false aceita o certificado do Supabase sem precisar baixá-lo.
      ssl: { rejectUnauthorized: false },
    });
  }

  return pool;
}

// Fecha todas as conexões. Usado por scripts (como o de migrations) para terminar.
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
