import fs from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import type { Pool } from 'pg';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { SupabaseCommentsRepository } from '../src/database/supabase/comments.repository';
import { type AuthUser, signToken } from '../src/shared/auth';

// Testes de integração dos comentários (tarefa B15).
// O SQL roda de verdade num PostgreSQL em memória (PGlite) com todas as migrations do projeto:
// o banco compartilhado do Supabase nunca é tocado.

const migrationsFolder = path.join(__dirname, '..', '..', '..', 'database', 'migrations');
const migrations = fs
  .readdirSync(migrationsFolder)
  .filter((file) => file.endsWith('.sql'))
  .sort()
  .map((file) => fs.readFileSync(path.join(migrationsFolder, file), 'utf8'));

function poolFrom(pglite: PGlite): Pool {
  const query = (text: string, params?: unknown[]) => pglite.query(text, params);
  return { query, connect: async () => ({ query, release: () => {} }) } as unknown as Pool;
}

let db: PGlite;
let app: ReturnType<typeof createApp>;

const superAdmin: AuthUser = { id: 1, name: 'Carla', role: 'SUPER_ADMIN', sectorId: null };
const adminPA: AuthUser = { id: 2, name: 'Ana', role: 'SECTOR_ADMIN', sectorId: 1 };
const viewerPA: AuthUser = { id: 3, name: 'Beto', role: 'VIEWER', sectorId: 1 };
const auth = (user: AuthUser) => ({ Authorization: `Bearer ${signToken(user)}` });

// Cria um comentário anônimo no setor, chegando na data/hora indicada (UTC).
async function addComment(sectorId: number, text: string, createdAt: string, type: string | null = null) {
  const response = await db.query<{ id: string }>(
    `INSERT INTO responses (sector_id, survey_id, shift_date, shift) VALUES ($1, $1, '2026-10-14', 'MANHA') RETURNING id`,
    [sectorId],
  );
  const comment = await db.query<{ id: number }>(
    `INSERT INTO comments (response_id, type, text, created_at) VALUES ($1, $2, $3, $4) RETURNING id`,
    [response.rows[0].id, type, text, createdAt],
  );
  return comment.rows[0].id;
}

const list = async (user: AuthUser, query = '') =>
  (await request(app).get(`/api/comments${query}`).set(auth(user))).body as {
    items: { id: number; text: string; sectorName: string; status: string }[];
    total: number;
  };

beforeEach(async () => {
  db = await PGlite.create();
  for (const sql of migrations) await db.exec(sql);
  await db.exec(`
    INSERT INTO sectors (name, slug) VALUES ('Pronto Atendimento', 'pronto-atendimento'), ('Raio-X', 'raio-x');
    INSERT INTO surveys (sector_id, title) VALUES (1, 'PA'), (2, 'RX');
    INSERT INTO users (name, email, password_hash, role, sector_id) VALUES
      ('Carla', 'carla@h.com', 'x', 'SUPER_ADMIN', NULL), ('Ana', 'ana@h.com', 'x', 'SECTOR_ADMIN', 1);
  `);
  const pool = poolFrom(db);
  app = createApp({ comments: new SupabaseCommentsRepository(() => pool) });
});

describe('GET /api/comments', () => {
  it('mais novos primeiro, com o nome do setor e o total', async () => {
    await addComment(1, 'Primeiro', '2026-10-10T12:00:00Z');
    await addComment(1, 'Segundo', '2026-10-12T12:00:00Z', 'ELOGIO');

    const body = await list(superAdmin);

    expect(body.total).toBe(2);
    expect(body.items.map((item) => item.text)).toEqual(['Segundo', 'Primeiro']);
    expect(body.items[0]).toMatchObject({ sectorName: 'Pronto Atendimento', status: 'NEW' });
  });

  it('admin de setor e visualizador só veem os do próprio setor (RN16)', async () => {
    await addComment(1, 'Do PA', '2026-10-10T12:00:00Z');
    await addComment(2, 'Do Raio-X', '2026-10-10T12:00:00Z');

    for (const user of [adminPA, viewerPA]) {
      expect((await list(user, '?sectorId=2')).items.map((item) => item.text)).toEqual(['Do PA']);
    }
    expect((await list(superAdmin, '?sectorId=2')).items.map((item) => item.text)).toEqual(['Do Raio-X']);
  });

  it('filtra por tipo e por situação', async () => {
    await addComment(1, 'Elogio', '2026-10-10T12:00:00Z', 'ELOGIO');
    const complaint = await addComment(1, 'Reclamação', '2026-10-10T12:00:00Z', 'RECLAMACAO');
    await request(app).patch(`/api/comments/${complaint}`).set(auth(adminPA)).send({ status: 'TREATED', treatmentNote: 'Liguei' });

    expect((await list(superAdmin, '?type=ELOGIO')).items.map((item) => item.text)).toEqual(['Elogio']);
    expect((await list(superAdmin, '?status=TREATED')).items.map((item) => item.text)).toEqual(['Reclamação']);
  });

  it('o período usa o dia no horário de Brasília', async () => {
    // 02:00 UTC do dia 15 = 23:00 do dia 14 em Brasília
    await addComment(1, 'Noite do dia 14', '2026-10-15T02:00:00Z');
    await addComment(1, 'Dia 15', '2026-10-15T15:00:00Z');

    const day14 = await list(superAdmin, '?from=2026-10-14&to=2026-10-14');
    expect(day14.items.map((item) => item.text)).toEqual(['Noite do dia 14']);
  });

  it('pagina com limit e offset', async () => {
    for (let day = 10; day < 15; day++) await addComment(1, `Dia ${day}`, `2026-10-${day}T12:00:00Z`);

    const page2 = await list(superAdmin, '?limit=2&offset=2');
    expect(page2.total).toBe(5);
    expect(page2.items.map((item) => item.text)).toEqual(['Dia 12', 'Dia 11']);
  });
});

describe('PATCH /api/comments/:id (RN17)', () => {
  it('marca como tratado com o que foi feito, quem tratou e quando', async () => {
    const id = await addComment(1, 'Demora', '2026-10-10T12:00:00Z', 'RECLAMACAO');

    const response = await request(app).patch(`/api/comments/${id}`).set(auth(adminPA)).send({
      status: 'TREATED',
      treatmentNote: 'Conversamos com a equipe da recepção',
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'TREATED',
      treatmentNote: 'Conversamos com a equipe da recepção',
      treatedBy: { id: 2, name: 'Ana' },
    });
    expect(response.body.treatedAt).toBeTruthy();
  });

  it('sem dizer o que foi feito não marca como tratado (decisão da dupla)', async () => {
    const id = await addComment(1, 'Demora', '2026-10-10T12:00:00Z');

    for (const treatmentNote of [undefined, '', '   ']) {
      const response = await request(app).patch(`/api/comments/${id}`).set(auth(adminPA)).send({ status: 'TREATED', treatmentNote });
      expect(response.status).toBe(400);
    }
    expect((await list(superAdmin)).items[0].status).toBe('NEW');
  });

  it('reabrir volta para "novo" e mantém a anotação (decisão da dupla)', async () => {
    const id = await addComment(1, 'Demora', '2026-10-10T12:00:00Z');
    await request(app).patch(`/api/comments/${id}`).set(auth(adminPA)).send({ status: 'TREATED', treatmentNote: 'Liguei' });

    const response = await request(app).patch(`/api/comments/${id}`).set(auth(adminPA)).send({ status: 'NEW' });

    expect(response.body).toMatchObject({ status: 'NEW', treatmentNote: 'Liguei', treatedBy: null, treatedAt: null });
  });

  it('visualizador não trata; admin não trata comentário de outro setor', async () => {
    const own = await addComment(1, 'PA', '2026-10-10T12:00:00Z');
    const other = await addComment(2, 'RX', '2026-10-10T12:00:00Z');
    const body = { status: 'TREATED', treatmentNote: 'ok' };

    expect((await request(app).patch(`/api/comments/${own}`).set(auth(viewerPA)).send(body)).status).toBe(403);
    expect((await request(app).patch(`/api/comments/${other}`).set(auth(adminPA)).send(body)).status).toBe(403);
  });

  it('comentário que não existe devolve 404', async () => {
    const response = await request(app).patch('/api/comments/999').set(auth(superAdmin)).send({ status: 'NEW' });
    expect(response.body.error.code).toBe('COMMENT_NOT_FOUND');
  });
});
