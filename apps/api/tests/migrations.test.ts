import fs from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';

// Roda TODAS as migrations de database/migrations, em ordem, num PostgreSQL em memória (PGlite)
// e confere que as tabelas e os índices do contrato existem (README, seção 8; docs/banco-de-dados.md).
// O banco compartilhado do Supabase nunca é tocado.

const folder = path.join(__dirname, '..', '..', '..', 'database', 'migrations');
const files = fs
  .readdirSync(folder)
  .filter((file) => file.endsWith('.sql'))
  .sort();

// Criar o banco em memória e rodar as migrations leva alguns segundos quando os outros testes rodam junto.
const TIMEOUT = 30_000;

describe('migrations do banco', () => {
  it('rodam em ordem, sem erro, e criam as tabelas e os índices', async () => {
    const db = await PGlite.create();
    for (const file of files) {
      await db.exec(fs.readFileSync(path.join(folder, file), 'utf8'));
    }

    const tables = (await db.query<{ tablename: string }>("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY 1")).rows;
    expect(tables.map((row) => row.tablename)).toEqual([
      'answers',
      'comments',
      'questions',
      'responses',
      'schedules',
      'sectors',
      'surveys',
      'teams',
      'users',
    ]);

    const indexes = (await db.query<{ indexname: string }>("SELECT indexname FROM pg_indexes WHERE schemaname = 'public'")).rows.map(
      (row) => row.indexname,
    );
    expect(indexes).toEqual(
      expect.arrayContaining([
        'surveys_one_active_per_sector', // RN02
        'questions_one_required_per_survey', // RN05
        'schedules_one_team_per_shift', // RN14
        'answers_one_per_question', // RN09
        'responses_sector_created_at',
        'responses_sector_shift', // migration 003: dashboard e escala
        'comments_status',
      ]),
    );
  }, TIMEOUT);

  it('as buscas por setor + data do plantão + turno usam o índice novo (migration 003)', async () => {
    const db = await PGlite.create();
    for (const file of files) {
      await db.exec(fs.readFileSync(path.join(folder, file), 'utf8'));
    }
    await db.exec(`
      INSERT INTO sectors (name, slug, code) SELECT 'Setor ' || n, 'setor-' || n, 'COD00' || n FROM generate_series(1, 4) n;
      INSERT INTO surveys (sector_id, title) SELECT id, 'P' FROM sectors;
      INSERT INTO responses (sector_id, survey_id, shift_date, shift, overall_score)
      SELECT (n % 4) + 1, (n % 4) + 1, DATE '2026-01-01' + (n % 270), (ARRAY['MANHA','TARDE','NOITE'])[(n % 3) + 1], (n % 5) + 1
      FROM generate_series(1, 20000) n;
      ANALYZE responses;
    `);

    const plan = (
      await db.query<Record<string, string>>(
        `EXPLAIN SELECT AVG(overall_score) FROM responses
         WHERE sector_id = 1 AND shift_date BETWEEN '2026-09-01' AND '2026-09-30' AND shift = 'NOITE'`,
      )
    ).rows
      .map((row) => Object.values(row)[0])
      .join('\n');

    expect(plan).toContain('responses_sector_shift');
  }, TIMEOUT);
});
