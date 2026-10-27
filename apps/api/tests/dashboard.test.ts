import { inflateSync } from 'node:zlib';
import type { PGlite } from '@electric-sql/pglite';
import ExcelJS from 'exceljs';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { SupabaseCommentsRepository } from '../src/database/supabase/comments.repository';
import { SupabaseDashboardRepository } from '../src/database/supabase/dashboard.repository';
import { SupabaseSectorsRepository } from '../src/database/supabase/sectors.repository';
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

  // Comentários: o TV Wall NUNCA pode mostrá-los (RN18). Um elogio, uma reclamação já tratada e um sem tipo.
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
  app = createApp({
    dashboard: new SupabaseDashboardRepository(pool),
    comments: new SupabaseCommentsRepository(pool),
    sectors: new SupabaseSectorsRepository(pool),
  });
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

describe('GET /api/public/tv: TV Wall sem login (RN18, D5)', () => {
  it('abre sem login: hospital todo, só percentuais, comparando os setores', async () => {
    const res = await request(app).get('/api/public/tv');

    expect(res.status).toBe(200);
    // Notas gerais: 1, 2, 3, 4, 5, 4, 4 (PA) e 4 (RX) → 8 notas, 5 satisfeitas (Bom ou Ótimo)
    expect(res.body.overall).toEqual({ satisfied: 63, distribution: { 1: 13, 2: 13, 3: 13, 4: 50, 5: 13 } });
    expect(res.body.steps).toEqual([
      { step: 'RECEPCAO', satisfied: 0 }, // 2, 2, 2, 2, 2, 1 e 3: nenhuma 4 ou 5
      { step: 'GERAL', satisfied: 63 },
    ]);
    expect(res.body.breakdown).toEqual({
      by: 'sector',
      items: [
        { key: String(ids.pa), label: 'Pronto Atendimento', satisfied: 57 }, // 4 de 7
        { key: String(ids.rx), label: 'Raio-X', satisfied: 100 },
      ],
    });
    // Setores ativos, para o filtro da tela
    expect(res.body.sectors).toEqual(expect.arrayContaining([{ id: ids.pa, name: 'Pronto Atendimento' }]));
  });

  it('nunca mostra comentários, quantidades de respostas nem equipes (D5)', async () => {
    const res = await request(app).get('/api/public/tv');
    const text = JSON.stringify(res.body);

    for (const forbidden of ['count', 'total', 'average', 'comment', 'team', 'Médico muito atencioso', 'Equipe']) {
      expect(text).not.toContain(forbidden);
    }
  });

  it('com um setor: só ele, comparando os turnos', async () => {
    const res = await request(app).get(`/api/public/tv?sectorId=${ids.pa}`);

    expect(res.body.overall).toEqual({ satisfied: 57, distribution: { 1: 14, 2: 14, 3: 14, 4: 43, 5: 14 } });
    expect(res.body.breakdown).toEqual({
      by: 'shift',
      items: [
        { key: 'MANHA', label: 'Manhã', satisfied: 40 }, // 1, 2, 3, 4, 5 → 2 de 5
        { key: 'NOITE', label: 'Noite', satisfied: 100 },
      ],
    });
  });

  it('o período filtra; sem nenhuma nota geral, overall é null', async () => {
    const since2 = await request(app).get('/api/public/tv?from=2026-10-02');
    expect(since2.body.overall).toEqual({ satisfied: 100, distribution: { 1: 0, 2: 0, 3: 0, 4: 100, 5: 0 } });

    const empty = await request(app).get('/api/public/tv?from=2030-01-01');
    expect(empty.body).toMatchObject({ overall: null, steps: [], breakdown: { by: 'sector', items: [] } });
  });

  it('setor que não existe → 404; período invertido → 400', async () => {
    const missing = await request(app).get('/api/public/tv?sectorId=9999');
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('SECTOR_NOT_FOUND');

    const inverted = await request(app).get('/api/public/tv?from=2026-10-05&to=2026-10-01');
    expect(inverted.status).toBe(400);
  });

  it('a rota antiga do TV Wall com comentários não existe mais', async () => {
    const res = await request(app).get('/api/dashboard/tv').set(auth(superAdmin));
    expect(res.status).toBe(404);
  });
});

describe('GET /api/dashboard/export.xlsx (RN19, A17)', () => {
  // Baixa a planilha como arquivo (bytes) e abre com o exceljs.
  async function download(user: AuthUser, query = '') {
    const res = await request(app)
      .get(`/api/dashboard/export.xlsx${query}`)
      .set(auth(user))
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      });
    const workbook = new ExcelJS.Workbook();
    if (res.status === 200) await workbook.xlsx.load(res.body);
    return { res, workbook };
  }

  const values = (sheet: ExcelJS.Worksheet, rowNumber: number) => (sheet.getRow(rowNumber).values as unknown[]).slice(1);

  it('super admin baixa as respostas do hospital, com 3 abas e cabeçalhos em português', async () => {
    const { res, workbook } = await download(superAdmin);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml');
    expect(res.headers['content-disposition']).toContain('.xlsx');
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Respostas', 'Perguntas', 'Filtros']);

    const responses = workbook.getWorksheet('Respostas')!;
    expect(values(responses, 1)).toEqual([
      'Código', 'Início (data e hora)', 'Data do plantão', 'Turno', 'Setor', 'Equipe', 'Situação',
      'Nota geral (1 a 5)', 'Tipo do comentário', 'Comentário',
    ]);
    expect(responses.rowCount).toBe(1 + 10);

    // Primeira resposta inserida: Pronto Atendimento, manhã de 01/10, Equipe A, nota 1, com elogio
    const first = values(responses, 2);
    expect(first.slice(2, 8)).toEqual(['01/10/2026', 'Manhã', 'Pronto Atendimento', 'Equipe A', 'Completa', 1]);
    expect(first.slice(8)).toEqual(['Elogio', 'Médico muito atencioso.']);

    // Aba Perguntas: uma linha por carinha tocada (5×2 + 2 + 1 + 1 + 1 = 15)
    expect(workbook.getWorksheet('Perguntas')!.rowCount).toBe(1 + 15);
  });

  it('nenhuma coluna de dado pessoal (RN08)', async () => {
    const { workbook } = await download(superAdmin);
    const headers = workbook.worksheets.flatMap((sheet) => values(sheet, 1).map(String).map((h) => h.toLowerCase()));
    for (const personal of ['nome', 'telefone', 'e-mail', 'email', 'cpf']) {
      expect(headers.some((h) => h.includes(personal))).toBe(false);
    }
  });

  it('usa os mesmos filtros do dashboard e mostra quais foram usados', async () => {
    const { workbook } = await download(superAdmin, '?from=2026-10-02&shift=TARDE');

    expect(workbook.getWorksheet('Respostas')!.rowCount).toBe(1 + 2); // as 2 do Raio-X à tarde
    const filters = workbook.getWorksheet('Filtros')!;
    expect(values(filters, 2)).toEqual(['Período (data do plantão)', '02/10/2026 a sem limite']);
    expect(values(filters, 4)).toEqual(['Turno', 'Tarde']);
    expect(values(filters, 6)).toEqual(['Respostas exportadas', 2]);
  });

  it('visualizador só exporta o próprio setor; outro setor → 403 (RN22)', async () => {
    const own = await download(viewerPA());
    expect(own.workbook.getWorksheet('Respostas')!.rowCount).toBe(1 + 8);

    const other = await download(viewerPA(), `?sectorId=${ids.rx}`);
    expect(other.res.status).toBe(403);
  });
});

describe('GET /api/dashboard/report.pdf: relatório do setor (RN23)', () => {
  // Lê os textos escritos dentro do PDF: abre cada trecho comprimido e junta os textos em <hexadecimal>.
  function pdfText(pdf: Buffer): string {
    const raw = pdf.toString('latin1');
    let text = '';
    for (const match of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
      let content: string;
      try {
        content = inflateSync(Buffer.from(match[1], 'latin1')).toString('latin1');
      } catch {
        continue; // trecho que não é texto (ex.: fonte)
      }
      for (const line of content.matchAll(/\[(.*?)\] TJ/g)) {
        text += [...line[1].matchAll(/<([0-9a-f]+)>/gi)].map((hex) => Buffer.from(hex[1], 'hex').toString('latin1')).join('');
        text += '\n';
      }
    }
    return text;
  }

  async function download(user: AuthUser | null, query: string) {
    const req = request(app).get(`/api/dashboard/report.pdf${query}`).buffer(true).parse((res, callback) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => callback(null, Buffer.concat(chunks)));
    });
    return user ? req.set(auth(user)) : req;
  }

  it('super admin baixa o PDF do setor no mês, com nota geral, carinhas, turnos e equipes', async () => {
    const res = await download(superAdmin, `?sectorId=${ids.pa}&month=2026-10`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.headers['content-disposition']).toContain('relatorio-pronto-atendimento-2026-10.pdf');
    expect((res.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');

    const text = pdfText(res.body);
    expect(text).toContain('Relatório do setor: Pronto Atendimento');
    expect(text).toContain('outubro de 2026');
    expect(text).toContain('3,3 de 5'); // notas 1, 2, 3, 4, 5, 4, 4 → 23 / 7
    expect(text).toContain('8 respostas: 7 completas, 1 em andamento e 0 abandonadas');
    expect(text).toContain('3 (43%)'); // 3 respostas "Bom" de 7
    expect(text).toContain('Manhã');
    expect(text).toContain('Equipe A');
    expect(text).toContain('Dados insuficientes'); // Equipe B: 2 respostas (RN15, D4)
    expect(text).not.toContain('Raio-X');
  });

  it('mês sem respostas: o PDF avisa', async () => {
    const res = await download(superAdmin, `?sectorId=${ids.pa}&month=2026-09`);

    expect(res.status).toBe(200);
    expect(pdfText(res.body)).toContain('Nenhuma resposta neste mês.');
  });

  it('admin de setor baixa só o do próprio setor; visualizador não baixa (403); sem login 401', async () => {
    expect((await download(adminPA(), `?sectorId=${ids.pa}&month=2026-10`)).status).toBe(200);
    expect((await download(adminPA(), `?sectorId=${ids.rx}&month=2026-10`)).status).toBe(403);
    expect((await download(viewerPA(), `?sectorId=${ids.pa}&month=2026-10`)).status).toBe(403);
    expect((await download(null, `?sectorId=${ids.pa}&month=2026-10`)).status).toBe(401);
  });

  it('setor e mês são obrigatórios e conferidos (400); setor que não existe → 404', async () => {
    expect((await download(superAdmin, `?month=2026-10`)).status).toBe(400);
    expect((await download(superAdmin, `?sectorId=${ids.pa}`)).status).toBe(400);
    expect((await download(superAdmin, `?sectorId=${ids.pa}&month=2026-13`)).status).toBe(400);
    const missing = await download(superAdmin, `?sectorId=9999&month=2026-10`);
    expect(missing.status).toBe(404);
  });
});
