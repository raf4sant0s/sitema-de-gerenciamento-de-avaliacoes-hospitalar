import fs from 'node:fs';
import path from 'node:path';
import { closePool, getPool } from './supabase/connection';

// Roda as migrations: os arquivos .sql de database/migrations, em ordem (001, 002, ...).
// Comando: npm run db:migrate (na raiz do projeto).
//
// A tabela schema_migrations guarda quais arquivos já rodaram.
// Assim, rodar o comando de novo só aplica os arquivos novos.
//
// ATENÇÃO: o banco é o mesmo para as duas. Avise a colega antes de rodar.

const migrationsFolder = path.join(__dirname, '..', '..', '..', '..', 'database', 'migrations');

async function migrate() {
  const pool = getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name        TEXT        PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const applied = await pool.query<{ name: string }>('SELECT name FROM schema_migrations');
  const alreadyApplied = new Set(applied.rows.map((row) => row.name));

  // sort() garante a ordem pelo número no começo do nome do arquivo
  const files = fs
    .readdirSync(migrationsFolder)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const pending = files.filter((file) => !alreadyApplied.has(file));

  if (pending.length === 0) {
    console.log('Nenhuma migration nova. O banco já está atualizado.');
    return;
  }

  for (const file of pending) {
    const sql = fs.readFileSync(path.join(migrationsFolder, file), 'utf8');
    const client = await pool.connect();

    // Cada arquivo roda numa transação: ou tudo dá certo, ou nada muda no banco.
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`Aplicada: ${file}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Erro na migration ${file}. Nada desse arquivo foi aplicado.`);
      throw error;
    } finally {
      client.release();
    }
  }

  console.log(`Pronto: ${pending.length} migration(s) aplicada(s).`);
}

migrate()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => closePool());
