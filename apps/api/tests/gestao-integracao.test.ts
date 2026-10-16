import type { PGlite } from '@electric-sql/pglite';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { createGestaoDatabase, repositoriesFor, TEST_PASSWORD, TEST_USERS } from './gestao-database';

// Testes de integração da gestão (tarefa B16): a API inteira, com TODOS os repositórios de verdade
// (SQL) num PostgreSQL em memória com os dados de exemplo (seeds 001 a 004).
// Aqui ninguém "finge" estar logado: cada perfil entra pelo POST /api/auth/login, com a senha,
// e usa o token que recebeu, igual ao site de gestão.
// O banco compartilhado do Supabase nunca é tocado.

let db: PGlite;
let app: ReturnType<typeof createApp>;
let paId: number; // Pronto Atendimento: o setor do admin e do visualizador de exemplo
let otherSectorId: number;
const tokens = { superAdmin: '', sectorAdmin: '', viewer: '' };

const as = (token: string) => ({ Authorization: `Bearer ${token}` });

async function login(email: string) {
  const res = await request(app).post('/api/auth/login').send({ email, password: TEST_PASSWORD });
  expect(res.status).toBe(200);
  return res.body.token as string;
}

beforeAll(async () => {
  db = await createGestaoDatabase();
  app = createApp(repositoriesFor(db));
  paId = (await db.query<{ id: number }>("SELECT id FROM sectors WHERE slug = 'pronto-atendimento'")).rows[0].id;
  otherSectorId = (await db.query<{ id: number }>("SELECT id FROM sectors WHERE slug <> 'pronto-atendimento' ORDER BY id LIMIT 1")).rows[0].id;
  tokens.superAdmin = await login(TEST_USERS.superAdmin);
  tokens.sectorAdmin = await login(TEST_USERS.sectorAdmin);
  tokens.viewer = await login(TEST_USERS.viewer);
});

describe('login (B9)', () => {
  it('senha errada e usuário desativado recebem 401 INVALID_CREDENTIALS', async () => {
    const wrong = await request(app).post('/api/auth/login').send({ email: TEST_USERS.viewer, password: 'senha-errada-123' });
    expect(wrong.status).toBe(401);
    expect(wrong.body.error.code).toBe('INVALID_CREDENTIALS');

    // Um visualizador novo, desativado logo em seguida, não consegue mais entrar (RN16)
    const created = await request(app)
      .post('/api/users')
      .set(as(tokens.sectorAdmin))
      .send({ name: 'Visualizador temporário', email: 'temporario@example.com', password: 'senha-inicial', role: 'VIEWER', sectorId: paId });
    await request(app).delete(`/api/users/${created.body.id}`).set(as(tokens.sectorAdmin));
    const off = await request(app).post('/api/auth/login').send({ email: 'temporario@example.com', password: 'senha-inicial' });
    expect(off.status).toBe(401);
  });

  it('GET /auth/me devolve o perfil e o setor de cada um (RN16)', async () => {
    const me = await request(app).get('/api/auth/me').set(as(tokens.viewer));
    expect(me.body.user).toMatchObject({ role: 'VIEWER', sectorId: paId });

    const noToken = await request(app).get('/api/auth/me');
    expect(noToken.status).toBe(401);
  });
});

describe('permissões dos 3 perfis (RN16, D8)', () => {
  it('setores: só o super admin cadastra; os outros veem só o próprio setor', async () => {
    const all = await request(app).get('/api/sectors').set(as(tokens.superAdmin));
    const own = await request(app).get('/api/sectors').set(as(tokens.viewer));
    const create = await request(app).post('/api/sectors').set(as(tokens.sectorAdmin)).send({ name: 'Ala X', slug: 'ala-x' });

    expect(all.body.length).toBeGreaterThan(1);
    expect(own.body.map((sector: { id: number }) => sector.id)).toEqual([paId]);
    expect(create.status).toBe(403);
  });

  it('admin de setor e visualizador não veem dados de outro setor', async () => {
    for (const token of [tokens.sectorAdmin, tokens.viewer]) {
      const sector = await request(app).get(`/api/sectors/${otherSectorId}`).set(as(token));
      expect(sector.status).toBe(403);

      // Nas listas, a API ignora o setor pedido e devolve só o da própria pessoa
      const teams = await request(app).get(`/api/teams?sectorId=${otherSectorId}`).set(as(token));
      const comments = await request(app).get(`/api/comments?sectorId=${otherSectorId}`).set(as(token));
      expect(new Set(teams.body.map((team: { sectorId: number }) => team.sectorId))).toEqual(new Set([paId]));
      expect(new Set(comments.body.items.map((comment: { sectorId: number }) => comment.sectorId))).toEqual(new Set([paId]));
    }
  });

  it('o visualizador só olha: não cadastra equipe, não muda a escala e não trata comentário', async () => {
    const team = await request(app).post('/api/teams').set(as(tokens.viewer)).send({ sectorId: paId, name: 'Equipe Z' });
    const schedule = await request(app)
      .put('/api/schedules')
      .set(as(tokens.viewer))
      .send({ items: [{ sectorId: paId, shiftDate: '2026-10-20', shift: 'MANHA', teamId: null }] });
    const comment = (await request(app).get('/api/comments').set(as(tokens.viewer))).body.items[0];
    const treat = await request(app)
      .patch(`/api/comments/${comment.id}`)
      .set(as(tokens.viewer))
      .send({ status: 'TREATED', treatmentNote: 'Tentativa do visualizador' });

    expect([team.status, schedule.status, treat.status]).toEqual([403, 403, 403]);
  });

  it('o admin de setor só cadastra visualizadores do próprio setor', async () => {
    const admin = await request(app)
      .post('/api/users')
      .set(as(tokens.sectorAdmin))
      .send({ name: 'Outro admin', email: 'outro.admin@example.com', password: 'senha-inicial', role: 'SECTOR_ADMIN', sectorId: paId });
    const otherSector = await request(app)
      .post('/api/users')
      .set(as(tokens.sectorAdmin))
      .send({ name: 'Visualizador de fora', email: 'fora@example.com', password: 'senha-inicial', role: 'VIEWER', sectorId: otherSectorId });

    expect([admin.status, otherSector.status]).toEqual([403, 403]);
  });

  it('TV Wall: só o super admin (RN18, D5)', async () => {
    const superAdmin = await request(app).get('/api/dashboard/tv').set(as(tokens.superAdmin));
    const sectorAdmin = await request(app).get('/api/dashboard/tv').set(as(tokens.sectorAdmin));
    const viewer = await request(app).get('/api/dashboard/tv').set(as(tokens.viewer));

    expect([superAdmin.status, sectorAdmin.status, viewer.status]).toEqual([200, 403, 403]);
  });
});

describe('cadastros de ponta a ponta (B11 a B14)', () => {
  it('super admin cria setor; o admin cria pesquisa com a obrigatória, ativa e o setor aparece para o paciente', async () => {
    const sector = await request(app).post('/api/sectors').set(as(tokens.superAdmin)).send({ name: 'Maternidade', slug: 'maternidade' });
    expect(sector.status).toBe(201);

    const survey = await request(app).post('/api/surveys').set(as(tokens.superAdmin)).send({ sectorId: sector.body.id, title: 'Pesquisa da maternidade' });
    await request(app).post(`/api/surveys/${survey.body.id}/questions`).set(as(tokens.superAdmin)).send({ text: 'Como foi a recepção?', step: 'RECEPCAO' });
    await request(app).put(`/api/surveys/${survey.body.id}`).set(as(tokens.superAdmin)).send({ active: true });

    // Rota pública do paciente (A): a opcional primeiro, a obrigatória por último (RN05, D2)
    const publicSurvey = await request(app).get('/api/public/sectors/maternidade');
    const questions = publicSurvey.body.survey.questions;
    expect(questions.map((question: { required: boolean }) => question.required)).toEqual([false, true]);
  });

  it('salvar a escala passa as respostas daquele plantão para a equipe (RN14)', async () => {
    const slot = (
      await db.query<{ shift_date: string; shift: string }>(
        'SELECT shift_date::text, shift FROM responses WHERE sector_id = $1 ORDER BY created_at LIMIT 1',
        [paId],
      )
    ).rows[0];
    const newTeam = await request(app).post('/api/teams').set(as(tokens.sectorAdmin)).send({ sectorId: paId, name: 'Equipe nova' });

    const saved = await request(app)
      .put('/api/schedules')
      .set(as(tokens.sectorAdmin))
      .send({ items: [{ sectorId: paId, shiftDate: slot.shift_date, shift: slot.shift, teamId: newTeam.body.id }] });

    expect(saved.status).toBe(200);
    expect(saved.body.responsesUpdated).toBeGreaterThan(0);
    const teams = await db.query<{ team_id: number }>(
      'SELECT DISTINCT team_id FROM responses WHERE sector_id = $1 AND shift_date = $2 AND shift = $3',
      [paId, slot.shift_date, slot.shift],
    );
    expect(teams.rows).toEqual([{ team_id: newTeam.body.id }]);
  });
});

describe('comentários (B15)', () => {
  it('admin trata com anotação, reabre e a anotação continua guardada (RN17)', async () => {
    const list = await request(app).get('/api/comments?status=NEW').set(as(tokens.sectorAdmin));
    const comment = list.body.items[0];
    expect(comment.sectorId).toBe(paId);

    const noNote = await request(app).patch(`/api/comments/${comment.id}`).set(as(tokens.sectorAdmin)).send({ status: 'TREATED' });
    expect(noNote.status).toBe(400);

    const treated = await request(app)
      .patch(`/api/comments/${comment.id}`)
      .set(as(tokens.sectorAdmin))
      .send({ status: 'TREATED', treatmentNote: 'Conversamos com a equipe da recepção.' });
    expect(treated.body).toMatchObject({ status: 'TREATED', treatedBy: { name: 'Admin do Pronto Atendimento (exemplo)' } });

    const reopened = await request(app).patch(`/api/comments/${comment.id}`).set(as(tokens.sectorAdmin)).send({ status: 'NEW' });
    expect(reopened.body).toMatchObject({ status: 'NEW', treatmentNote: 'Conversamos com a equipe da recepção.' });
  });

  it('o super admin vê os comentários de todos os setores; os outros, só os do seu', async () => {
    const all = await request(app).get('/api/comments?limit=200').set(as(tokens.superAdmin));
    const own = await request(app).get('/api/comments?limit=200').set(as(tokens.viewer));

    const sectorsOf = (items: { sectorId: number }[]) => [...new Set(items.map((item) => item.sectorId))];
    expect(sectorsOf(all.body.items).length).toBeGreaterThan(1);
    expect(sectorsOf(own.body.items)).toEqual([paId]);
    expect(all.body.total).toBeGreaterThan(own.body.total);
  });
});
