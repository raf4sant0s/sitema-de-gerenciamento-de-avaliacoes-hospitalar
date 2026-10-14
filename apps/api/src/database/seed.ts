import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { closePool, getPool } from './supabase/connection';

// Coloca os dados de exemplo no banco: os arquivos .sql de database/seeds, em ordem (001, 002, ...).
// Comando: npm run db:seed (na raiz do projeto), depois do npm run db:migrate.
//
// A senha dos usuários de exemplo vem do SEED_PASSWORD (arquivo apps/api/.env) e nunca fica
// escrita nos arquivos: eles têm a marca {{SEED_PASSWORD_HASH}}, trocada aqui pelo hash bcrypt.
//
// Segurança: só roda se o banco estiver vazio (sem setores). Assim nunca duplica nem apaga dados.
// ATENÇÃO: o banco é o mesmo para as duas. Avise a colega antes de rodar.

const seedsFolder = path.join(__dirname, '..', '..', '..', '..', 'database', 'seeds');
const PASSWORD_MARK = '{{SEED_PASSWORD_HASH}}';

async function seed() {
  const password = process.env.SEED_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error('Coloque no arquivo apps/api/.env a linha SEED_PASSWORD=... com uma senha de pelo menos 8 caracteres.');
  }

  const pool = getPool();

  const existing = await pool.query<{ total: number }>('SELECT COUNT(*)::int AS total FROM sectors');
  if (existing.rows[0].total > 0) {
    console.log('O banco já tem dados (a tabela sectors não está vazia). Nada foi feito.');
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const files = fs
    .readdirSync(seedsFolder)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const client = await pool.connect();

  // Todos os arquivos rodam numa transação só: ou tudo entra, ou nada muda no banco.
  try {
    await client.query('BEGIN');
    for (const file of files) {
      // split/join em vez de replace: o hash tem "$", que o replace trataria como comando especial.
      const sql = fs.readFileSync(path.join(seedsFolder, file), 'utf8').split(PASSWORD_MARK).join(passwordHash);
      await client.query(sql);
      console.log(`Rodou: ${file}`);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro nos dados de exemplo. Nada foi gravado no banco.');
    throw error;
  } finally {
    client.release();
  }

  console.log(`Pronto: ${files.length} arquivo(s) de dados de exemplo.`);
}

seed()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => closePool());
