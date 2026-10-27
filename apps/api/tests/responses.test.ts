import type { PGlite } from '@electric-sql/pglite';
import express from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { SupabaseResponsesRepository } from '../src/database/supabase/responses.repository';
import { createResponsesRouter } from '../src/modules/responses/responses.routes';
import { ResponsesService } from '../src/modules/responses/responses.service';
import { errorHandler, notFoundHandler } from '../src/shared/errors';
import { getShift } from '../src/shared/shift';
import { createTestDatabase, poolFrom } from './pglite';

// Testes de integração das rotas públicas da pesquisa (tarefa A10).
// Usam um PostgreSQL de verdade, mas em memória (PGlite): o banco compartilhado do Supabase
// nunca é tocado. Ele recebe a migration da Rafaela e os seeds de setores, pesquisas e escala.

let db: PGlite;
let app: express.Express;
let service: ResponsesService;

async function one<T>(sql: string, params: unknown[] = []): Promise<T> {
  return (await db.query<T>(sql, params)).rows[0];
}

// Ids das perguntas do Pronto Atendimento (seed 001).
async function prontoAtendimento() {
  const sector = await one<{ id: number }>("SELECT id FROM sectors WHERE slug = 'pronto-atendimento'");
  const survey = await one<{ id: number }>('SELECT id FROM surveys WHERE sector_id = $1 AND active', [sector.id]);
  const questions = (
    await db.query<{ id: number; step: string; required: boolean }>(
      'SELECT id, step, required FROM questions WHERE survey_id = $1 ORDER BY position',
      [survey.id],
    )
  ).rows;
  return {
    sectorId: sector.id,
    surveyId: survey.id,
    recepcao: questions.find((q) => q.step === 'RECEPCAO')!.id,
    medico: questions.find((q) => q.step === 'MEDICO')!.id,
    geral: questions.find((q) => q.required)!.id,
  };
}

async function startResponse(value = 4) {
  const pa = await prontoAtendimento();
  const res = await request(app)
    .post('/api/public/responses')
    .send({ sectorId: pa.sectorId, surveyId: pa.surveyId, questionId: pa.recepcao, value });
  return { pa, id: res.body.id as string };
}

beforeAll(async () => {
  db = await createTestDatabase();

  service = new ResponsesService(new SupabaseResponsesRepository(() => poolFrom(db)));
  app = express();
  app.use(express.json());
  app.use('/api', createResponsesRouter(service));
  app.use(notFoundHandler);
  app.use(errorHandler);
}, 60_000);

describe('GET /api/public/sectors/:slug (RN01, RN02, RN05)', () => {
  it('devolve o setor e as perguntas, com a obrigatória por último', async () => {
    const res = await request(app).get('/api/public/sectors/pronto-atendimento');

    expect(res.status).toBe(200);
    expect(res.body.sector).toMatchObject({ name: 'Pronto Atendimento', slug: 'pronto-atendimento' });
    const steps = res.body.survey.questions.map((q: { step: string }) => q.step);
    expect(steps).toEqual(['RECEPCAO', 'TRIAGEM', 'ENFERMAGEM', 'MEDICO', 'GERAL']);
    expect(res.body.survey.questions.at(-1).required).toBe(true);
  });

  it('o link pelo código curto não existe mais (RN01, migration 004)', async () => {
    const res = await request(app).get('/api/public/sectors/by-code/PA7K2Q');
    expect(res.status).toBe(404);
    expect(res.body.sector).toBeUndefined();
  });

  it('setor inexistente ou inativo → 404 no formato padrão', async () => {
    await db.query("UPDATE sectors SET active = FALSE WHERE slug = 'ambulatorio'");

    for (const url of ['/api/public/sectors/nao-existe', '/api/public/sectors/ambulatorio']) {
      const res = await request(app).get(url);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('SECTOR_NOT_FOUND');
    }
  });
});

describe('POST /api/public/responses (RN09, RN13, RN14)', () => {
  it('cria a resposta no primeiro toque, com turno, data do plantão e equipe', async () => {
    const before = getShift(new Date());
    const { pa, id } = await startResponse(2);

    const saved = await one<{ status: string; shift: string; shift_date: string; team_id: number | null }>(
      "SELECT status, shift, to_char(shift_date, 'YYYY-MM-DD') AS shift_date, team_id FROM responses WHERE id = $1",
      [id],
    );
    expect(saved.status).toBe('PARTIAL');
    expect(saved.shift).toBe(before.shift);
    expect(saved.shift_date).toBe(before.shiftDate);
    expect(saved.team_id).not.toBeNull();

    const answer = await one<{ value: number }>('SELECT value FROM answers WHERE response_id = $1 AND question_id = $2', [
      id,
      pa.recepcao,
    ]);
    expect(answer.value).toBe(2);
  });

  it('carinha fora de 1 a 5 → 400 VALIDATION_ERROR (RN04)', async () => {
    const pa = await prontoAtendimento();
    const res = await request(app)
      .post('/api/public/responses')
      .send({ sectorId: pa.sectorId, surveyId: pa.surveyId, questionId: pa.recepcao, value: 6 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('pergunta de outro setor → 404 QUESTION_NOT_FOUND', async () => {
    const pa = await prontoAtendimento();
    const other = await one<{ id: number }>(
      "SELECT questions.id FROM questions JOIN surveys ON surveys.id = questions.survey_id JOIN sectors ON sectors.id = surveys.sector_id WHERE sectors.slug = 'raio-x' LIMIT 1",
    );
    const res = await request(app)
      .post('/api/public/responses')
      .send({ sectorId: pa.sectorId, surveyId: pa.surveyId, questionId: other.id, value: 3 });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('QUESTION_NOT_FOUND');
  });
});

describe('PUT /answers, POST /comment e POST /complete (RN05, RN09, RN10, RN11)', () => {
  it('tocar de novo na mesma pergunta troca a carinha, sem duplicar', async () => {
    const { pa, id } = await startResponse(1);

    const res = await request(app).put(`/api/public/responses/${id}/answers/${pa.recepcao}`).send({ value: 5 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    const rows = (await db.query<{ value: number }>('SELECT value FROM answers WHERE response_id = $1', [id])).rows;
    expect(rows).toEqual([{ value: 5 }]);
  });

  it('não termina sem a obrigatória → 400 REQUIRED_MISSING', async () => {
    const { id } = await startResponse();

    const res = await request(app).post(`/api/public/responses/${id}/complete`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('REQUIRED_MISSING');
  });

  it('caminho completo: obrigatória, comentário e fim; depois disso nada muda (409)', async () => {
    const { pa, id } = await startResponse();

    expect((await request(app).put(`/api/public/responses/${id}/answers/${pa.medico}`).send({ value: 5 })).status).toBe(200);
    expect((await request(app).put(`/api/public/responses/${id}/answers/${pa.geral}`).send({ value: 3 })).status).toBe(200);

    const comment = await request(app)
      .post(`/api/public/responses/${id}/comment`)
      .send({ type: 'RECLAMACAO', text: '  Esperei muito na recepção.  ' });
    expect(comment.status).toBe(201);

    const done = await request(app).post(`/api/public/responses/${id}/complete`);
    expect(done.status).toBe(200);

    const saved = await one<{ status: string; overall_score: number; completed_at: Date | null }>(
      'SELECT status, overall_score, completed_at FROM responses WHERE id = $1',
      [id],
    );
    expect(saved.status).toBe('COMPLETE');
    expect(saved.overall_score).toBe(3); // RN20: cópia da obrigatória
    expect(saved.completed_at).not.toBeNull();

    const savedComment = await one<{ type: string; text: string; status: string }>(
      'SELECT type, text, status FROM comments WHERE response_id = $1',
      [id],
    );
    expect(savedComment).toEqual({ type: 'RECLAMACAO', text: 'Esperei muito na recepção.', status: 'NEW' });

    // Tocar "terminar" de novo não é erro; mudar uma resposta terminada é.
    expect((await request(app).post(`/api/public/responses/${id}/complete`)).status).toBe(200);
    const late = await request(app).put(`/api/public/responses/${id}/answers/${pa.recepcao}`).send({ value: 1 });
    expect(late.status).toBe(409);
    expect(late.body.error.code).toBe('RESPONSE_CLOSED');
  });

  it('comentário: sem tipo é aceito; vazio → 400; segundo comentário → 409', async () => {
    const { id } = await startResponse();

    expect((await request(app).post(`/api/public/responses/${id}/comment`).send({ text: '   ' })).status).toBe(400);
    expect((await request(app).post(`/api/public/responses/${id}/comment`).send({ text: 'Foi tudo normal.' })).status).toBe(201);

    const again = await request(app).post(`/api/public/responses/${id}/comment`).send({ text: 'De novo' });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('COMMENT_ALREADY_SENT');
  });

  it('resposta abandonada não aceita mais toques (409)', async () => {
    const { pa, id } = await startResponse();
    await db.query("UPDATE responses SET status = 'ABANDONED' WHERE id = $1", [id]);

    const res = await request(app).put(`/api/public/responses/${id}/answers/${pa.geral}`).send({ value: 4 });

    expect(res.status).toBe(409);
  });

  it('resposta inexistente ou id inválido → 404 RESPONSE_NOT_FOUND', async () => {
    for (const id of ['00000000-0000-4000-8000-000000000000', 'abc']) {
      const res = await request(app).post(`/api/public/responses/${id}/complete`);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('RESPONSE_NOT_FOUND');
    }
  });

  it('nenhum dado pessoal é guardado (RN08): as tabelas não têm colunas de paciente', async () => {
    const columns = (
      await db.query<{ column_name: string }>(
        "SELECT column_name FROM information_schema.columns WHERE table_name IN ('responses', 'answers', 'comments')",
      )
    ).rows.map((c) => c.column_name);

    for (const personal of ['name', 'phone', 'email', 'cpf']) {
      expect(columns).not.toContain(personal);
    }
  });
});

describe('Respostas abandonadas (RN10, tarefa A12)', () => {
  it('PARTIAL parada há mais de 30 min vira ABANDONED; as outras não mudam; os toques continuam lá', async () => {
    const old = await startResponse(2);
    const recent = await startResponse(4);
    const finished = await startResponse(5);
    await db.query("UPDATE responses SET updated_at = NOW() - INTERVAL '31 minutes' WHERE id = $1", [old.id]);
    await db.query("UPDATE responses SET updated_at = NOW() - INTERVAL '29 minutes' WHERE id = $1", [recent.id]);
    await db.query(
      "UPDATE responses SET status = 'COMPLETE', updated_at = NOW() - INTERVAL '2 hours' WHERE id = $1",
      [finished.id],
    );

    const total = await service.abandonInactive();

    expect(total).toBe(1);
    const status = async (id: string) => (await one<{ status: string }>('SELECT status FROM responses WHERE id = $1', [id])).status;
    expect(await status(old.id)).toBe('ABANDONED');
    expect(await status(recent.id)).toBe('PARTIAL');
    expect(await status(finished.id)).toBe('COMPLETE');

    // RN10: o que o paciente respondeu antes de sair continua contando nos indicadores
    const answers = await one<{ total: number }>('SELECT count(*)::int AS total FROM answers WHERE response_id = $1', [old.id]);
    expect(answers.total).toBe(1);
  });

  it('rodar de novo não muda nada (só pega as PARTIAL)', async () => {
    expect(await service.abandonInactive()).toBe(0);
  });
});
describe('Avisos de tempo real (A15)', () => {
  it('cada toque, o comentário e o fim avisam o setor; o abandono avisa uma vez por setor', async () => {
    const notify = vi.fn();
    const live = new ResponsesService(new SupabaseResponsesRepository(() => poolFrom(db)), undefined, { notify });
    const pa = await prontoAtendimento();

    const id = await live.createResponse({ sectorId: pa.sectorId, surveyId: pa.surveyId, questionId: pa.recepcao, value: 3 });
    await live.saveAnswer(id, pa.geral, 4);
    await live.addComment(id, null, 'Tudo certo.');
    await live.complete(id);

    expect(notify.mock.calls).toEqual([
      ['response:changed', pa.sectorId],
      ['response:changed', pa.sectorId],
      ['comment:created', pa.sectorId],
      ['response:changed', pa.sectorId],
    ]);

    const first = await live.createResponse({ sectorId: pa.sectorId, surveyId: pa.surveyId, questionId: pa.recepcao, value: 1 });
    const second = await live.createResponse({ sectorId: pa.sectorId, surveyId: pa.surveyId, questionId: pa.recepcao, value: 2 });
    await db.query("UPDATE responses SET updated_at = NOW() - INTERVAL '40 minutes' WHERE id IN ($1, $2)", [first, second]);
    notify.mockClear();

    expect(await live.abandonInactive()).toBe(2);
    expect(notify.mock.calls).toEqual([['response:changed', pa.sectorId]]);
  });
});