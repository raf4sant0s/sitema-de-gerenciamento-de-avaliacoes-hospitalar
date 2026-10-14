import type { PGlite } from '@electric-sql/pglite';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { SupabaseCommentsRepository } from '../src/database/supabase/comments.repository';
import { SupabaseDashboardRepository } from '../src/database/supabase/dashboard.repository';
import { type AuthUser, signToken } from '../src/shared/auth';
import { createTestDatabase, poolFrom } from './pglite';

// Testes de integração do dashboard (tarefa A13), com banco em memória (PGlite).
// Os dados abaixo são poucos e escolhidos a dedo, para sabermos de antemão cada média.
//
//  #   setor  turno  data plantão  equipe  status     nota geral  recepção
//  1-5 PA     MANHA  2026-10-01    PA-A    COMPLETE   1,2,3,4,5   2 (cada)
//  6-7 PA     NOITE  2026-10-02    PA-B    COMPLETE   4,4         —
//  8   PA     NOITE  2026-10-02    PA-B    PARTIAL    —           1
//  9   RX     TARDE  2026-10-02    RX-A    COMPLETE   4           —
//  10  RX     TARDE  2026-10-02    RX-A    ABANDONED  —           3

let db: PGlite;
let app: ReturnType<typeof createApp>;
const ids = { pa: 0, rx: 0 };
const responseIds: string[] = [];

const superAdmin: AuthUser = { id: 1, name: 'Carla', role: 'SUPER_ADMIN', sectorId: null };
const auth = (user: AuthUser) => ({ Authorization: `Bearer ${signToken(user)}` });
const viewerPA = (): AuthUser => ({ id: 3, name: 'Beto', role: 'VIEWER', sectorId: ids.pa });
const adminPA = (): AuthUser => ({ id: 2, name: 'Ana', role: 'SECTOR_ADMIN', sectorId: ids.pa });

async function one<T>(sql: string, params: unknown[] = []): Promise<T> {
  return (await db.query<T>(sql, params)).rows[0];
}

async function sectorData(slug: string) {
  const sector = await one<{ id: number }>('SELECT id FROM sectors WHERE slug = $1', [slug]);
  const survey = await one<{ id: number }>('SELECT id FROM surveys WHERE sector_id = $1', [sector.id]);
  const recepcao = await one<{ id: number }>("SELECT id FROM questions WHERE survey_id = $1 AND step = 'RECEPCAO'", [survey.id]);
  const geral = await one<{ id: number }>('SELECT id FROM questions WHERE survey_id = $1 AND required', [survey.id]);
  const team = async (name: string) =>
    (await one<{ id: number }>('SELECT id FROM teams WHERE sector_id = $1 AND name = $2', [sector.id, name])).id;
  return { sectorId: sector.id, surveyId: survey.id, recepcao: recepcao.id, geral: geral.id, team };
}

async function insertResponse(
  s: Awaited<ReturnType<typeof sectorData>>,
  data: { shift: string; date: string; teamId: number; status: string; overall?: number; recepcao?: number },
) {
  const { id } = await one<{ id: string }>(
    `INSERT INTO responses (sector_id, survey_id, shift_date, shift, team_id, status, overall_score)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [s.sectorId, s.surveyId, data.date, data.shift, data.teamId, data.status, data.overall ?? null],
  );
  responseIds.push(id);
  if (data.recepcao) {
    await db.query('INSERT INTO answers (response_id, question_id, value) VALUES ($1, $2, $3)', [id, s.recepcao, data.recepcao]);
  }
  if (data.overall) {
    await db.query('INSERT INTO answers (response_id, question_id, value) VALUES ($1, $2, $3)', [id, s.geral, data.overall]);
  }
}

beforeAll(async () => {
  db = await createTestDatabase();
  const pa = await sectorData('pronto-atendimento');
  const rx = await sectorData('raio-x');
  ids.pa = pa.sectorId;
  ids.rx = rx.sectorId;
  const paA = await pa.team('Equipe A');
  const paB = await pa.team('Equipe B');
  const rxA = await rx.team('Equipe A');

  for (const overall of [1, 2, 3, 4, 5]) {
    await insertResponse(pa, { shift: 'MANHA', date: '2026-10-01', teamId: paA, status: 'COMPLETE', overall, recepcao: 2 });
  }
  for (const overall of [4, 4]) {
    await insertResponse(pa, { shift: 'NOITE', date: '2026-10-02', teamId: paB, status: 'COMPLETE', overall });
  }
  await insertResponse(pa, { shift: 'NOITE', date: '2026-10-02', teamId: paB, status: 'PARTIAL', recepcao: 1 });
  await insertResponse(rx, { shift: 'TARDE', date: '2026-10-02', teamId: rxA, status: 'COMPLETE', overall: 4 });
  await insertResponse(rx, { shift: 'TARDE', date: '2026-10-02', teamId: rxA, status: 'ABANDONED', recepcao: 3 });

  // Comentários para o TV Wall (A16): um elogio, uma reclamação já tratada e um sem tipo.
  const comment = (responseIndex: number, type: string | null, text: string, status: string, createdAt: string) =>
    db.query('INSERT INTO comments (response_id, type, text, status, created_at) VALUES ($1, $2, $3, $4, $5)', [
      responseIds[responseIndex],
      type,
      text,
      status,
      createdAt,
    ]);
  await comment(0, 'ELOGIO', 'Médico muito atencioso.', 'NEW', '2026-10-01T10:00:00-03:00');
  await comment(8, 'RECLAMACAO', 'Demorou muito no Raio-X.', 'TREATED', '2026-10-02T15:00:00-03:00');
  await comment(5, null, 'Foi tudo normal.', 'NEW', '2026-10-02T20:00:00-03:00');

  const pool = () => poolFrom(db);
  app = createApp({ dashboard: new SupabaseDashboardRepository(pool), comments: new SupabaseCommentsRepository(pool) });
}, 60_000);

describe('GET /api/dashboard/summary (RN20)', () => {
  it('super admin vê o hospital todo: nota geral, totais e carinhas', async () => {
    const res = await request(app).get('/api/dashboard/summary').set(auth(superAdmin));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      overallAverage: 3.4, // 27 / 8 = 3,375
      totalResponses: 10,
      complete: 8,
      partial: 1,
      abandoned: 1,
      distribution: { 1: 1, 2: 1, 3: 1, 4: 4, 5: 1 },
    });
  });

  it('visualizador vê só o próprio setor, mesmo sem filtrar (RN22)', async () => {
    const res = await request(app).get('/api/dashboard/summary').set(auth(viewerPA()));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ overallAverage: 3.3, totalResponses: 8, complete: 7, partial: 1, abandoned: 0 }); // 23 / 7
  });

  it('admin de setor e visualizador não podem pedir outro setor → 403', async () => {
    for (const user of [viewerPA(), adminPA()]) {
      const res = await request(app).get(`/api/dashboard/summary?sectorId=${ids.rx}`).set(auth(user));
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    }
    const own = await request(app).get(`/api/dashboard/summary?sectorId=${ids.pa}`).set(auth(adminPA()));
    expect(own.status).toBe(200);
  });

  it('sem login → 401', async () => {
    const res = await request(app).get('/api/dashboard/summary');
    expect(res.status).toBe(401);
  });

  it('filtros por período (data do plantão), turno e equipe', async () => {
    const since2 = await request(app).get('/api/dashboard/summary?from=2026-10-02').set(auth(superAdmin));
    expect(since2.body).toMatchObject({ totalResponses: 5, complete: 3, overallAverage: 4 });

    const morning = await request(app).get('/api/dashboard/summary?shift=MANHA').set(auth(superAdmin));
    expect(morning.body).toMatchObject({ totalResponses: 5, overallAverage: 3 });

    const onlyFirstDay = await request(app).get('/api/dashboard/summary?from=2026-10-01&to=2026-10-01').set(auth(superAdmin));
    expect(onlyFirstDay.body.totalResponses).toBe(5);

    const teamB = (await one<{ id: number }>("SELECT id FROM teams WHERE sector_id = $1 AND name = 'Equipe B'", [ids.pa])).id;
    const team = await request(app).get(`/api/dashboard/summary?teamId=${teamB}`).set(auth(superAdmin));
    expect(team.body).toMatchObject({ totalResponses: 3, complete: 2, partial: 1, overallAverage: 4 });
  });

  it('filtro inválido → 400 VALIDATION_ERROR', async () => {
    for (const query of ['from=ontem', 'shift=MADRUGADA', 'sectorId=abc', 'from=2026-10-05&to=2026-10-01']) {
      const res = await request(app).get(`/api/dashboard/summary?${query}`).set(auth(superAdmin));
      expect(res.status, query).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
  });
});

describe('GET /api/dashboard/questions e /steps (RN21)', () => {
  it('média de cada pergunta; puladas não entram', async () => {
    const res = await request(app).get('/api/dashboard/questions').set(auth(superAdmin));

    expect(res.status).toBe(200);
    expect(res.body.map((q: { step: string; average: number; count: number }) => [q.step, q.average, q.count])).toEqual([
      ['RECEPCAO', 1.8, 6], // Pronto Atendimento: (2×5 + 1) / 6
      ['GERAL', 3.3, 7],
      ['RECEPCAO', 3, 1], // Raio-X
      ['GERAL', 4, 1],
    ]);
    expect(res.body[0]).toHaveProperty('text', 'Como foi o atendimento na recepção?');
  });

  it('média por etapa, na ordem da jornada', async () => {
    const res = await request(app).get('/api/dashboard/steps').set(auth(superAdmin));

    expect(res.body).toEqual([
      { step: 'RECEPCAO', average: 2, count: 7 }, // (10 + 1 + 3) / 7
      { step: 'GERAL', average: 3.4, count: 8 },
    ]);
  });
});

describe('GET /api/dashboard/breakdown (RN15, RN22)', () => {
  it('por equipe: com menos de 5 respostas, "dados insuficientes" e sem média', async () => {
    const res = await request(app).get('/api/dashboard/breakdown?by=team').set(auth(superAdmin));

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      expect.objectContaining({ label: 'Equipe A · Pronto Atendimento', average: 3, count: 5, insufficient: false }),
      expect.objectContaining({ label: 'Equipe B · Pronto Atendimento', average: null, count: 2, insufficient: true }),
      expect.objectContaining({ label: 'Equipe A · Raio-X', average: null, count: 1, insufficient: true }),
    ]);
  });

  it('por turno, na ordem manhã, tarde, noite', async () => {
    const res = await request(app).get('/api/dashboard/breakdown?by=shift').set(auth(superAdmin));

    expect(res.body).toEqual([
      { key: 'MANHA', label: 'Manhã', average: 3, count: 5, insufficient: false },
      { key: 'TARDE', label: 'Tarde', average: 4, count: 1, insufficient: false },
      { key: 'NOITE', label: 'Noite', average: 4, count: 2, insufficient: false },
    ]);
  });

  it('por setor: o visualizador só vê o dele', async () => {
    const all = await request(app).get('/api/dashboard/breakdown?by=sector').set(auth(superAdmin));
    expect(all.body.map((row: { label: string; average: number }) => [row.label, row.average])).toEqual([
      ['Pronto Atendimento', 3.3],
      ['Raio-X', 4],
    ]);

    const viewer = await request(app).get('/api/dashboard/breakdown?by=sector').set(auth(viewerPA()));
    expect(viewer.body.map((row: { label: string }) => row.label)).toEqual(['Pronto Atendimento']);
  });

  it('sem "by" ou com valor errado → 400', async () => {
    expect((await request(app).get('/api/dashboard/breakdown').set(auth(superAdmin))).status).toBe(400);
    expect((await request(app).get('/api/dashboard/breakdown?by=pessoa').set(auth(superAdmin))).status).toBe(400);
  });
});

describe('GET /api/dashboard/timeline', () => {
  it('nota geral dia a dia, pela data do plantão', async () => {
    const res = await request(app).get('/api/dashboard/timeline').set(auth(superAdmin));

    expect(res.body).toEqual([
      { date: '2026-10-01', average: 3, count: 5 },
      { date: '2026-10-02', average: 4, count: 3 },
    ]);
  });
});

describe('GET /api/dashboard/tv (RN18, A16)', () => {
  it('super admin vê o hospital todo, a nota por setor e TODOS os comentários, os mais novos primeiro', async () => {
    const res = await request(app).get('/api/dashboard/tv').set(auth(superAdmin));

    expect(res.status).toBe(200);
    expect(res.body.summary).toMatchObject({ overallAverage: 3.4, totalResponses: 10 });
    expect(res.body.sectors.map((s: { label: string }) => s.label)).toEqual(['Pronto Atendimento', 'Raio-X']);
    expect(res.body.totalComments).toBe(3);
    expect(res.body.comments.map((c: { type: string | null; status: string; sectorName: string }) => [c.type, c.status, c.sectorName])).toEqual([
      [null, 'NEW', 'Pronto Atendimento'],
      ['RECLAMACAO', 'TREATED', 'Raio-X'],
      ['ELOGIO', 'NEW', 'Pronto Atendimento'],
    ]);
    // Na TV não aparece quem tratou nem a anotação interna
    expect(res.body.comments[1]).not.toHaveProperty('treatedBy');
    expect(res.body.comments[1]).not.toHaveProperty('treatmentNote');
  });

  it('o período filtra os indicadores e os comentários', async () => {
    const res = await request(app).get('/api/dashboard/tv?from=2026-10-02').set(auth(superAdmin));

    expect(res.body.summary.totalResponses).toBe(5);
    expect(res.body.totalComments).toBe(2);
  });

  it('admin de setor e visualizador não abrem o TV Wall → 403 (D5)', async () => {
    for (const user of [adminPA(), viewerPA()]) {
      const res = await request(app).get('/api/dashboard/tv').set(auth(user));
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    }
  });
});
