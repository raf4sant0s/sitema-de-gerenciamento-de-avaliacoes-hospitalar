import fs from 'node:fs';
import path from 'node:path';
import type { Sector } from '@avaliacoes/schemas';
import { PGlite } from '@electric-sql/pglite';
import type { Pool } from 'pg';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { SupabaseSchedulesRepository } from '../src/database/supabase/schedules.repository';
import { monthRange } from '../src/modules/schedules/schedules.service';
import { type AuthUser, signToken } from '../src/shared/auth';
import { fakeSectorsRepository } from './fakes';

// Testes de integração das equipes e da escala (tarefa B14).
// O SQL roda de verdade num PostgreSQL em memória (PGlite) com TODAS as migrations do projeto:
// o banco compartilhado do Supabase nunca é tocado.

const migrationsFolder = path.join(__dirname, '..', '..', '..', 'database', 'migrations');
const migrations = fs
  .readdirSync(migrationsFolder)
  .filter((file) => file.endsWith('.sql'))
  .sort()
  .map((file) => fs.readFileSync(path.join(migrationsFolder, file), 'utf8'));

// Faz o PGlite parecer o Pool da biblioteca pg (só o que o repositório usa).
function poolFrom(pglite: PGlite): Pool {
  const query = async (text: string, params?: unknown[]) => {
    const result = await pglite.query(text, params);
    return { ...result, rowCount: result.affectedRows ?? 0 }; // o pg chama de rowCount
  };
  return { query, connect: async () => ({ query, release: () => {} }) } as unknown as Pool;
}

const sectors: Sector[] = [
  { id: 1, name: 'Pronto Atendimento', slug: 'pronto-atendimento', code: 'PA7K2Q', active: true, created_at: new Date() },
  { id: 2, name: 'Raio-X', slug: 'raio-x', code: 'RX3M9T', active: true, created_at: new Date() },
];

let db: PGlite;
let app: ReturnType<typeof createApp>;

const superAdmin: AuthUser = { id: 1, name: 'Carla', role: 'SUPER_ADMIN', sectorId: null };
const adminPA: AuthUser = { id: 2, name: 'Ana', role: 'SECTOR_ADMIN', sectorId: 1 };
const viewerPA: AuthUser = { id: 3, name: 'Beto', role: 'VIEWER', sectorId: 1 };
const auth = (user: AuthUser) => ({ Authorization: `Bearer ${signToken(user)}` });

beforeEach(async () => {
  db = await PGlite.create();
  for (const sql of migrations) await db.exec(sql);
  await db.exec(`
    INSERT INTO sectors (name, slug, code) VALUES ('Pronto Atendimento', 'pronto-atendimento', 'PA7K2Q'), ('Raio-X', 'raio-x', 'RX3M9T');
    INSERT INTO surveys (sector_id, title) VALUES (1, 'Pesquisa do PA');
  `);
  const pool = poolFrom(db);
  app = createApp({ schedules: new SupabaseSchedulesRepository(() => pool), sectors: fakeSectorsRepository(sectors) });
});

async function newTeam(user: AuthUser, sectorId: number, name: string) {
  return (await request(app).post('/api/teams').set(auth(user)).send({ sectorId, name })).body;
}

const save = (user: AuthUser, items: object[]) => request(app).put('/api/schedules').set(auth(user)).send({ items });

async function addResponse(shiftDate: string, shift: string, teamId: number | null = null) {
  await db.query(`INSERT INTO responses (sector_id, survey_id, shift_date, shift, team_id) VALUES (1, 1, $1, $2, $3)`, [
    shiftDate,
    shift,
    teamId,
  ]);
}

const teamsOfResponses = async () =>
  (await db.query<{ team_id: number | null }>('SELECT team_id FROM responses ORDER BY created_at, id')).rows.map((row) => row.team_id);

describe('mês da escala', () => {
  it('calcula o primeiro e o último dia, inclusive em fevereiro de ano bissexto', () => {
    expect(monthRange('2026-10')).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(monthRange('2028-02')).toEqual({ from: '2028-02-01', to: '2028-02-29' });
  });
});

describe('equipes', () => {
  it('admin cria equipe no próprio setor; equipe nasce ativa', async () => {
    const team = await newTeam(adminPA, 1, 'Equipe A');
    expect(team).toMatchObject({ sectorId: 1, name: 'Equipe A', active: true });
  });

  it('admin não cria equipe em outro setor; visualizador não cria', async () => {
    expect((await request(app).post('/api/teams').set(auth(adminPA)).send({ sectorId: 2, name: 'X' })).status).toBe(403);
    expect((await request(app).post('/api/teams').set(auth(viewerPA)).send({ sectorId: 1, name: 'X' })).status).toBe(403);
  });

  it('cada um vê as equipes do próprio setor; o visualizador também vê', async () => {
    await newTeam(superAdmin, 1, 'Equipe A');
    await newTeam(superAdmin, 2, 'Equipe RX');

    const viewer = await request(app).get('/api/teams').set(auth(viewerPA));
    const all = await request(app).get('/api/teams').set(auth(superAdmin));

    expect(viewer.body.map((team: { name: string }) => team.name)).toEqual(['Equipe A']);
    expect(all.body).toHaveLength(2);
  });

  it('DELETE desativa a equipe (decisão da dupla): ela continua no banco', async () => {
    const team = await newTeam(adminPA, 1, 'Equipe A');

    const response = await request(app).delete(`/api/teams/${team.id}`).set(auth(adminPA));

    expect(response.body.active).toBe(false);
    expect((await db.query('SELECT * FROM teams')).rows).toHaveLength(1);
  });
});

describe('escala', () => {
  it('grava, lê o mês e troca a equipe de uma célula', async () => {
    const a = await newTeam(adminPA, 1, 'Equipe A');
    const b = await newTeam(adminPA, 1, 'Equipe B');

    await save(adminPA, [
      { sectorId: 1, shiftDate: '2026-10-14', shift: 'MANHA', teamId: a.id },
      { sectorId: 1, shiftDate: '2026-10-14', shift: 'NOITE', teamId: a.id },
    ]);
    await save(adminPA, [{ sectorId: 1, shiftDate: '2026-10-14', shift: 'NOITE', teamId: b.id }]);
    const month = await request(app).get('/api/schedules?month=2026-10').set(auth(adminPA));

    expect(month.body).toEqual([
      { sectorId: 1, shiftDate: '2026-10-14', shift: 'MANHA', teamId: a.id },
      { sectorId: 1, shiftDate: '2026-10-14', shift: 'NOITE', teamId: b.id },
    ]);
  });

  it('teamId null tira a equipe da célula', async () => {
    const a = await newTeam(adminPA, 1, 'Equipe A');
    await save(adminPA, [{ sectorId: 1, shiftDate: '2026-10-14', shift: 'TARDE', teamId: a.id }]);

    await save(adminPA, [{ sectorId: 1, shiftDate: '2026-10-14', shift: 'TARDE', teamId: null }]);

    expect((await request(app).get('/api/schedules?month=2026-10').set(auth(adminPA))).body).toEqual([]);
  });

  it('respostas que chegaram antes da escala passam para a equipe cadastrada (decisão da dupla)', async () => {
    const a = await newTeam(adminPA, 1, 'Equipe A');
    const b = await newTeam(adminPA, 1, 'Equipe B');
    await addResponse('2026-10-14', 'NOITE'); // chegou sem escala
    await addResponse('2026-10-14', 'NOITE');
    await addResponse('2026-10-14', 'MANHA'); // outro turno: não muda

    const first = await save(adminPA, [{ sectorId: 1, shiftDate: '2026-10-14', shift: 'NOITE', teamId: a.id }]);
    expect(first.body).toEqual({ saved: 1, responsesUpdated: 2 });
    expect(await teamsOfResponses()).toEqual([a.id, a.id, null]);

    // Corrigiu a escala: as respostas vão junto
    await save(adminPA, [{ sectorId: 1, shiftDate: '2026-10-14', shift: 'NOITE', teamId: b.id }]);
    expect(await teamsOfResponses()).toEqual([b.id, b.id, null]);

    // Tirou a equipe: as respostas ficam sem equipe
    await save(adminPA, [{ sectorId: 1, shiftDate: '2026-10-14', shift: 'NOITE', teamId: null }]);
    expect(await teamsOfResponses()).toEqual([null, null, null]);
  });

  it('não aceita equipe de outro setor nem equipe desativada; nada é gravado', async () => {
    const rx = await newTeam(superAdmin, 2, 'Equipe RX');
    const off = await newTeam(adminPA, 1, 'Antiga');
    const ok = await newTeam(adminPA, 1, 'Equipe A');
    await request(app).delete(`/api/teams/${off.id}`).set(auth(adminPA));

    const otherSector = await save(adminPA, [{ sectorId: 1, shiftDate: '2026-10-14', shift: 'MANHA', teamId: rx.id }]);
    const inactive = await save(adminPA, [
      { sectorId: 1, shiftDate: '2026-10-15', shift: 'MANHA', teamId: ok.id },
      { sectorId: 1, shiftDate: '2026-10-14', shift: 'MANHA', teamId: off.id },
    ]);

    expect(otherSector.status).toBe(400);
    expect(inactive.status).toBe(400);
    expect(inactive.body.error.message).toContain('Antiga');
    expect((await db.query('SELECT * FROM schedules')).rows).toHaveLength(0);
  });

  it('admin não grava escala de outro setor; visualizador só vê', async () => {
    const rx = await newTeam(superAdmin, 2, 'Equipe RX');

    expect((await save(adminPA, [{ sectorId: 2, shiftDate: '2026-10-14', shift: 'MANHA', teamId: rx.id }])).status).toBe(403);
    expect((await save(viewerPA, [])).status).toBe(403);
    expect((await request(app).get('/api/schedules?month=2026-10').set(auth(viewerPA))).status).toBe(200);
  });

  it('super admin precisa dizer o setor; mês em formato errado devolve 400', async () => {
    expect((await request(app).get('/api/schedules?month=2026-10').set(auth(superAdmin))).status).toBe(400);
    expect((await request(app).get('/api/schedules?sectorId=1&month=10-2026').set(auth(superAdmin))).status).toBe(400);
    expect((await request(app).get('/api/schedules?sectorId=1&month=2026-10').set(auth(superAdmin))).status).toBe(200);
  });
});
