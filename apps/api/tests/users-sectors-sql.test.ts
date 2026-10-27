import { PGlite } from '@electric-sql/pglite';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { SupabaseSectorsRepository } from '../src/database/supabase/sectors.repository';
import { SupabaseUsersRepository } from '../src/database/supabase/users.repository';
import { type AuthUser, signToken } from '../src/shared/auth';
import { createTestDatabase, poolFrom } from './pglite';

// Testes de integração do SQL de usuários e setores (tarefa B16).
// Os testes de regras (auth, users, sectors) usam um banco de mentira; estes conferem o SQL de verdade,
// num PostgreSQL em memória (PGlite) com as migrations e os seeds de estrutura.
// O banco compartilhado do Supabase nunca é tocado.

let db: PGlite;
let app: ReturnType<typeof createApp>;
let paId: number;
let rxId: number;

const superAdmin: AuthUser = { id: 1, name: 'Carla', role: 'SUPER_ADMIN', sectorId: null };
const auth = (user: AuthUser) => ({ Authorization: `Bearer ${signToken(user)}` });

// Criar o banco em memória leva alguns segundos quando os outros testes rodam junto.
const TIMEOUT = 30_000;

beforeEach(async () => {
  db = await createTestDatabase();
  const pool = poolFrom(db);
  app = createApp({ users: new SupabaseUsersRepository(() => pool), sectors: new SupabaseSectorsRepository(() => pool) });

  paId = (await db.query<{ id: number }>("SELECT id FROM sectors WHERE slug = 'pronto-atendimento'")).rows[0].id;
  rxId = (await db.query<{ id: number }>("SELECT id FROM sectors WHERE slug = 'raio-x'")).rows[0].id;
  const hash = await bcrypt.hash('senha-de-teste', 10);
  await db.query(`INSERT INTO users (name, email, password_hash, role, sector_id) VALUES ('Carla', 'carla@hospital.com', $1, 'SUPER_ADMIN', NULL)`, [
    hash,
  ]);
}, TIMEOUT);

describe('SQL de usuários', () => {
  it('cadastra, lista em ordem alfabética, altera e entra (login) no banco de verdade', async () => {
    const created = await request(app)
      .post('/api/users')
      .set(auth(superAdmin))
      .send({ name: 'Ana', email: 'Ana@Hospital.com', password: 'senha-inicial', role: 'SECTOR_ADMIN', sectorId: paId });
    await request(app)
      .post('/api/users')
      .set(auth(superAdmin))
      .send({ name: 'Beto', email: 'beto@hospital.com', password: 'senha-inicial', role: 'VIEWER', sectorId: paId });
    await request(app)
      .post('/api/users')
      .set(auth(superAdmin))
      .send({ name: 'Davi', email: 'davi@hospital.com', password: 'senha-inicial', role: 'VIEWER', sectorId: rxId });

    expect(created.status).toBe(201);

    // Só o super admin lista, todos em ordem alfabética
    const listed = await request(app).get('/api/users').set(auth(superAdmin));
    expect(listed.body.map((user: { name: string }) => user.name)).toEqual(['Ana', 'Beto', 'Carla', 'Davi']);

    // Alteração com várias colunas e senha nova
    const changed = await request(app)
      .put(`/api/users/${created.body.id}`)
      .set(auth(superAdmin))
      .send({ name: 'Ana Souza', role: 'VIEWER', sectorId: rxId, password: 'senha-nova-123' });
    expect(changed.body).toMatchObject({ name: 'Ana Souza', role: 'VIEWER', sectorId: rxId });

    // Login no banco de verdade: e-mail sem diferenciar maiúsculas, senha nova
    const login = await request(app).post('/api/auth/login').send({ email: 'ana@hospital.com', password: 'senha-nova-123' });
    expect(login.status).toBe(200);
    expect(login.body.user).toMatchObject({ name: 'Ana Souza', role: 'VIEWER', sectorId: rxId });
  }, TIMEOUT);

  it('o banco recusa e-mail repetido mesmo se a regra da API falhasse (UNIQUE)', async () => {
    await expect(
      db.query(`INSERT INTO users (name, email, password_hash, role) VALUES ('X', 'carla@hospital.com', 'h', 'SUPER_ADMIN')`),
    ).rejects.toThrow();
  }, TIMEOUT);
});

describe('SQL de setores', () => {
  it('cria com o link da pesquisa, lista em ordem alfabética, renomeia e desativa', async () => {
    const created = await request(app).post('/api/sectors').set(auth(superAdmin)).send({ name: 'Ala B', slug: 'ala-b' });
    expect(created.status).toBe(201);
    expect(created.body.surveyUrl).toMatch(/\/avaliacao\/ala-b$/);

    const names = (await request(app).get('/api/sectors').set(auth(superAdmin))).body.map((sector: { name: string }) => sector.name);
    expect(names).toEqual([...names].sort((a: string, b: string) => a.localeCompare(b)));
    expect(names).toContain('Ala B');

    const renamed = await request(app).put(`/api/sectors/${created.body.id}`).set(auth(superAdmin)).send({ name: 'Ala B - Adulto' });
    const off = await request(app).delete(`/api/sectors/${created.body.id}`).set(auth(superAdmin));

    expect(renamed.body).toMatchObject({ name: 'Ala B - Adulto', slug: 'ala-b' });
    expect(off.body.active).toBe(false);
  }, TIMEOUT);

  it('link já usado pelos dados de exemplo devolve 409', async () => {
    const response = await request(app).post('/api/sectors').set(auth(superAdmin)).send({ name: 'PA', slug: 'pronto-atendimento' });
    expect(response.status).toBe(409);
  }, TIMEOUT);
});
