import fs from 'node:fs';
import path from 'node:path';
import type { Sector } from '@avaliacoes/schemas';
import { PGlite } from '@electric-sql/pglite';
import type { Pool } from 'pg';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { SupabaseSurveysRepository } from '../src/database/supabase/surveys.repository';
import { DEFAULT_REQUIRED_QUESTION } from '../src/modules/surveys/surveys.service';
import { type AuthUser, signToken } from '../src/shared/auth';
import { fakeSectorsRepository } from './fakes';

// Testes de integração das pesquisas e perguntas (tarefa B13).
// O SQL roda de verdade num PostgreSQL em memória (PGlite) com a migration do projeto:
// o banco compartilhado do Supabase nunca é tocado.

const migration = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'database', 'migrations', '001_cria_tabelas.sql'), 'utf8');

// Faz o PGlite parecer o Pool da biblioteca pg (só o que o repositório usa).
function poolFrom(pglite: PGlite): Pool {
  const query = (text: string, params?: unknown[]) => pglite.query(text, params);
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
  await db.exec(migration);
  await db.exec("INSERT INTO sectors (name, slug, code) VALUES ('Pronto Atendimento', 'pronto-atendimento', 'PA7K2Q'), ('Raio-X', 'raio-x', 'RX3M9T')");
  const pool = poolFrom(db);
  app = createApp({ surveys: new SupabaseSurveysRepository(() => pool), sectors: fakeSectorsRepository(sectors) });
});

async function newSurvey(user: AuthUser, sectorId: number, title = 'Pesquisa') {
  return (await request(app).post('/api/surveys').set(auth(user)).send({ sectorId, title })).body;
}

async function addQuestion(surveyId: number, text: string, step = 'RECEPCAO') {
  return (await request(app).post(`/api/surveys/${surveyId}/questions`).set(auth(superAdmin)).send({ text, step })).body;
}

const questionsOf = async (surveyId: number) =>
  (await request(app).get(`/api/surveys/${surveyId}/questions`).set(auth(superAdmin))).body as {
    id: number;
    text: string;
    required: boolean;
    active: boolean;
    answerCount: number;
  }[];

describe('pesquisas', () => {
  it('nasce desativada e já com a pergunta obrigatória (RN05)', async () => {
    const survey = await newSurvey(superAdmin, 1, 'Pesquisa do PA');

    expect(survey).toMatchObject({ sectorId: 1, title: 'Pesquisa do PA', active: false });
    const questions = await questionsOf(survey.id);
    expect(questions).toHaveLength(1);
    expect(questions[0]).toMatchObject({ text: DEFAULT_REQUIRED_QUESTION, required: true, active: true });
  });

  it('ativar uma pesquisa desativa a que estava ativa no mesmo setor (RN02), sem mexer em outro setor', async () => {
    const first = await newSurvey(superAdmin, 1, 'Antiga');
    const second = await newSurvey(superAdmin, 1, 'Nova');
    const otherSector = await newSurvey(superAdmin, 2, 'Raio-X');
    await request(app).put(`/api/surveys/${first.id}`).set(auth(superAdmin)).send({ active: true });
    await request(app).put(`/api/surveys/${otherSector.id}`).set(auth(superAdmin)).send({ active: true });

    const response = await request(app).put(`/api/surveys/${second.id}`).set(auth(superAdmin)).send({ active: true });

    expect(response.body.active).toBe(true);
    const active = (await db.query<{ title: string }>('SELECT title FROM surveys WHERE active ORDER BY title')).rows;
    expect(active.map((row) => row.title)).toEqual(['Nova', 'Raio-X']);
  });

  it('admin de setor vê e cria só no próprio setor; visualizador não acessa', async () => {
    await newSurvey(superAdmin, 2, 'Raio-X');
    const own = await request(app).post('/api/surveys').set(auth(adminPA)).send({ sectorId: 1, title: 'Minha' });
    const other = await request(app).post('/api/surveys').set(auth(adminPA)).send({ sectorId: 2, title: 'Outro' });
    const list = await request(app).get('/api/surveys').set(auth(adminPA));

    expect(own.status).toBe(201);
    expect(other.status).toBe(403);
    expect(list.body.map((survey: { title: string }) => survey.title)).toEqual(['Minha']);
    expect((await request(app).get('/api/surveys').set(auth(viewerPA))).status).toBe(403);
  });

  it('super admin filtra por setor; setor inexistente devolve 404', async () => {
    await newSurvey(superAdmin, 1, 'PA');
    await newSurvey(superAdmin, 2, 'RX');

    const filtered = await request(app).get('/api/surveys?sectorId=2').set(auth(superAdmin));
    const missing = await request(app).post('/api/surveys').set(auth(superAdmin)).send({ sectorId: 99, title: 'X' });

    expect(filtered.body.map((survey: { title: string }) => survey.title)).toEqual(['RX']);
    expect(missing.body.error.code).toBe('SECTOR_NOT_FOUND');
  });
});

describe('perguntas', () => {
  it('perguntas novas entram no fim das opcionais; a obrigatória fica sempre por último', async () => {
    const survey = await newSurvey(superAdmin, 1);
    await addQuestion(survey.id, 'Recepção?', 'RECEPCAO');
    await addQuestion(survey.id, 'Enfermagem?', 'ENFERMAGEM');

    expect((await questionsOf(survey.id)).map((question) => question.text)).toEqual([
      'Recepção?',
      'Enfermagem?',
      DEFAULT_REQUIRED_QUESTION,
    ]);
  });

  it('reordena as opcionais; a lista precisa ter todas, sem a obrigatória', async () => {
    const survey = await newSurvey(superAdmin, 1);
    const a = await addQuestion(survey.id, 'A');
    const b = await addQuestion(survey.id, 'B');
    const c = await addQuestion(survey.id, 'C');

    const ok = await request(app).put(`/api/surveys/${survey.id}/questions/order`).set(auth(superAdmin)).send({ ids: [c.id, a.id, b.id] });
    const incomplete = await request(app).put(`/api/surveys/${survey.id}/questions/order`).set(auth(superAdmin)).send({ ids: [c.id, a.id] });

    expect(ok.body.map((question: { text: string }) => question.text)).toEqual(['C', 'A', 'B', DEFAULT_REQUIRED_QUESTION]);
    expect(incomplete.status).toBe(400);
  });

  it('a obrigatória pode mudar o texto, mas não ser desativada nem mudar de etapa (RN05)', async () => {
    const survey = await newSurvey(superAdmin, 1);
    const required = (await questionsOf(survey.id))[0];

    const text = await request(app).put(`/api/questions/${required.id}`).set(auth(superAdmin)).send({ text: 'Como foi o hospital?' });
    const off = await request(app).delete(`/api/questions/${required.id}`).set(auth(superAdmin));
    const step = await request(app).put(`/api/questions/${required.id}`).set(auth(superAdmin)).send({ step: 'MEDICO' });

    expect(text.body.text).toBe('Como foi o hospital?');
    expect(off.status).toBe(400);
    expect(off.body.error.code).toBe('REQUIRED_QUESTION_LOCKED');
    expect(step.status).toBe(400);
  });

  it('DELETE desativa a pergunta opcional (não apaga) e dá para reativar', async () => {
    const survey = await newSurvey(superAdmin, 1);
    const question = await addQuestion(survey.id, 'Triagem?', 'TRIAGEM');

    const off = await request(app).delete(`/api/questions/${question.id}`).set(auth(superAdmin));
    const on = await request(app).put(`/api/questions/${question.id}`).set(auth(superAdmin)).send({ active: true });

    expect(off.body.active).toBe(false);
    expect(on.body.active).toBe(true);
  });

  it('mostra quantas respostas a pergunta já recebeu (para avisar ao editar o texto)', async () => {
    const survey = await newSurvey(superAdmin, 1);
    const question = await addQuestion(survey.id, 'Médico?', 'MEDICO');
    const response = await db.query<{ id: string }>(
      "INSERT INTO responses (sector_id, survey_id, shift_date, shift) VALUES (1, $1, '2026-10-14', 'MANHA') RETURNING id",
      [survey.id],
    );
    await db.query('INSERT INTO answers (response_id, question_id, value) VALUES ($1, $2, 4)', [response.rows[0].id, question.id]);

    const listed = (await questionsOf(survey.id)).find((item) => item.id === question.id)!;
    const edited = await request(app).put(`/api/questions/${question.id}`).set(auth(superAdmin)).send({ text: 'Como foi o médico?' });

    expect(listed.answerCount).toBe(1);
    expect(edited.status).toBe(200);
    expect(edited.body).toMatchObject({ text: 'Como foi o médico?', answerCount: 1 });
  });

  it('admin de setor não mexe em pergunta de pesquisa de outro setor', async () => {
    const survey = await newSurvey(superAdmin, 2);
    const question = await addQuestion(survey.id, 'Raio-X?');

    const response = await request(app).put(`/api/questions/${question.id}`).set(auth(adminPA)).send({ text: 'X' });
    expect(response.status).toBe(403);
  });

  it('pergunta e pesquisa inexistentes devolvem 404', async () => {
    expect((await request(app).put('/api/questions/999').set(auth(superAdmin)).send({ text: 'X' })).body.error.code).toBe(
      'QUESTION_NOT_FOUND',
    );
    expect((await request(app).get('/api/surveys/999/questions').set(auth(superAdmin))).body.error.code).toBe('SURVEY_NOT_FOUND');
  });
});
