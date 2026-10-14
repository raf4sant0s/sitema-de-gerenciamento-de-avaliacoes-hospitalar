import type { Sector } from '@avaliacoes/schemas';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import type { SectorsRepository } from '../src/database/repositories/sectors.repository';
import { type AuthUser, signToken } from '../src/shared/auth';
import { generateCode, SectorsService } from '../src/modules/sectors/sectors.service';

// "Banco de mentira" de setores, só na memória: os testes não tocam no Supabase.
let sectors: Sector[] = [];

const fakeSectors: SectorsRepository = {
  async list() {
    return [...sectors].sort((a, b) => a.name.localeCompare(b.name));
  },
  async findById(id) {
    return sectors.find((sector) => sector.id === id) ?? null;
  },
  async findBySlug(slug) {
    return sectors.find((sector) => sector.slug === slug) ?? null;
  },
  async findByCode(code) {
    return sectors.find((sector) => sector.code === code) ?? null;
  },
  async create(data) {
    const sector: Sector = { id: sectors.length + 1, ...data, active: true, created_at: new Date() };
    sectors.push(sector);
    return sector;
  },
  async update(id, data) {
    const sector = sectors.find((item) => item.id === id);
    if (!sector) return null;
    Object.assign(sector, Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)));
    return sector;
  },
};

const app = createApp({ sectors: fakeSectors });

const superAdmin: AuthUser = { id: 1, name: 'Carla', role: 'SUPER_ADMIN', sectorId: null };
const adminPA: AuthUser = { id: 2, name: 'Ana', role: 'SECTOR_ADMIN', sectorId: 1 };
const viewerPA: AuthUser = { id: 3, name: 'Beto', role: 'VIEWER', sectorId: 1 };
const auth = (user: AuthUser) => ({ Authorization: `Bearer ${signToken(user)}` });

beforeEach(() => {
  sectors = [
    { id: 1, name: 'Pronto Atendimento', slug: 'pronto-atendimento', code: 'PA7K2Q', active: true, created_at: new Date() },
    { id: 2, name: 'Raio-X', slug: 'raio-x', code: 'RX3M9T', active: true, created_at: new Date() },
  ];
});

describe('código curto (RN01)', () => {
  it('tem 6 caracteres, sem letras e números fáceis de confundir', () => {
    for (let i = 0; i < 200; i++) {
      expect(generateCode()).toMatch(/^[A-HJKMNP-Z2-9]{6}$/);
    }
  });
});

describe('GET /api/sectors', () => {
  it('sem login devolve 401', async () => {
    expect((await request(app).get('/api/sectors')).status).toBe(401);
  });

  it('super admin vê todos os setores, com os dois links da pesquisa', async () => {
    const response = await request(app).get('/api/sectors').set(auth(superAdmin));

    expect(response.status).toBe(200);
    expect(response.body.map((sector: { name: string }) => sector.name)).toEqual(['Pronto Atendimento', 'Raio-X']);
    expect(response.body[0].surveyUrl).toBe('http://localhost:5173/pronto-atendimento');
    expect(response.body[0].shortUrl).toBe('http://localhost:5173/c/PA7K2Q');
  });

  it('admin de setor e visualizador só veem o próprio setor (RN16)', async () => {
    for (const user of [adminPA, viewerPA]) {
      const response = await request(app).get('/api/sectors').set(auth(user));
      expect(response.body.map((sector: { id: number }) => sector.id)).toEqual([1]);
    }
  });

  it('admin de setor não abre o setor de outra pessoa', async () => {
    expect((await request(app).get('/api/sectors/2').set(auth(adminPA))).status).toBe(403);
    expect((await request(app).get('/api/sectors/1').set(auth(adminPA))).status).toBe(200);
  });
});

describe('POST /api/sectors', () => {
  it('super admin cria o setor; a API gera o código de 6 caracteres', async () => {
    const response = await request(app)
      .post('/api/sectors')
      .set(auth(superAdmin))
      .send({ name: 'Internação', slug: 'internacao' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ name: 'Internação', slug: 'internacao', active: true });
    expect(response.body.code).toMatch(/^[A-Z0-9]{6}$/);
    expect(response.body.surveyUrl).toBe('http://localhost:5173/internacao');
  });

  it('admin de setor e visualizador não criam setor (403)', async () => {
    for (const user of [adminPA, viewerPA]) {
      const response = await request(app).post('/api/sectors').set(auth(user)).send({ name: 'X', slug: 'x' });
      expect(response.status).toBe(403);
    }
  });

  it('link repetido devolve 409', async () => {
    const response = await request(app)
      .post('/api/sectors')
      .set(auth(superAdmin))
      .send({ name: 'Outro PA', slug: 'pronto-atendimento' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('SLUG_TAKEN');
  });

  it('link fora do formato ou reservado devolve 400', async () => {
    for (const slug of ['Pronto Atendimento', 'internação', 'tv', 'login', '']) {
      const response = await request(app).post('/api/sectors').set(auth(superAdmin)).send({ name: 'Setor', slug });
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('se o código sorteado já existir, sorteia outro', async () => {
    // Banco onde o primeiro código sorteado já está em uso
    const codes = ['PA7K2Q', 'NOVO22'];
    const service = new SectorsService(fakeSectors, 'http://site', () => codes.shift()!);

    const created = await service.create('Ambulatório', 'ambulatorio');
    expect(created.code).toBe('NOVO22');
  });
});

describe('PUT e DELETE /api/sectors/:id', () => {
  it('super admin muda o nome; link e código continuam iguais', async () => {
    const response = await request(app).put('/api/sectors/1').set(auth(superAdmin)).send({ name: 'PA Adulto' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ name: 'PA Adulto', slug: 'pronto-atendimento', code: 'PA7K2Q' });
  });

  it('não deixa mudar o link nem o código (decisão da dupla)', async () => {
    for (const body of [{ slug: 'outro-link' }, { code: 'AAAAAA' }, { name: 'X', slug: 'outro' }]) {
      const response = await request(app).put('/api/sectors/1').set(auth(superAdmin)).send(body);
      expect(response.status).toBe(400);
    }
    expect(sectors[0].slug).toBe('pronto-atendimento');
  });

  it('DELETE desativa o setor, sem apagar; e dá para reativar', async () => {
    const off = await request(app).delete('/api/sectors/2').set(auth(superAdmin));
    expect(off.body.active).toBe(false);
    expect(sectors).toHaveLength(2);

    const on = await request(app).put('/api/sectors/2').set(auth(superAdmin)).send({ active: true });
    expect(on.body.active).toBe(true);
  });

  it('admin de setor não edita nem desativa (403)', async () => {
    expect((await request(app).put('/api/sectors/1').set(auth(adminPA)).send({ name: 'X' })).status).toBe(403);
    expect((await request(app).delete('/api/sectors/1').set(auth(adminPA))).status).toBe(403);
  });

  it('setor que não existe devolve 404', async () => {
    const response = await request(app).put('/api/sectors/99').set(auth(superAdmin)).send({ name: 'X' });
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('SECTOR_NOT_FOUND');
  });
});

describe('GET /api/sectors/:id/qrcode (RN01)', () => {
  it('super admin baixa a imagem PNG do QR Code', async () => {
    const response = await request(app).get('/api/sectors/1/qrcode?type=code').set(auth(superAdmin));

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('image/png');
    expect(response.headers['content-disposition']).toContain('qrcode-pronto-atendimento-PA7K2Q.png');
    // Todo arquivo PNG começa com estes bytes
    expect(response.body.subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  });

  it('admin baixa o do próprio setor, mas não o de outro', async () => {
    expect((await request(app).get('/api/sectors/1/qrcode').set(auth(adminPA))).status).toBe(200);
    expect((await request(app).get('/api/sectors/2/qrcode').set(auth(adminPA))).status).toBe(403);
  });

  it('visualizador não baixa QR Code (403)', async () => {
    expect((await request(app).get('/api/sectors/1/qrcode').set(auth(viewerPA))).status).toBe(403);
  });
});
