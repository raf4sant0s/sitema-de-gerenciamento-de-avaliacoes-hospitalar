import type { Sector, User } from '@avaliacoes/schemas';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { type AuthUser, signToken } from '../src/shared/auth';
import { fakeSectorsRepository, fakeUsersRepository } from './fakes';

const users: User[] = [];
const sectors: Sector[] = [];
const app = createApp({ users: fakeUsersRepository(users), sectors: fakeSectorsRepository(sectors) });

const SENHA = 'senha-atual-123';
let hash = '';

const superAdmin: AuthUser = { id: 1, name: 'Carla', role: 'SUPER_ADMIN', sectorId: null };
const adminPA: AuthUser = { id: 2, name: 'Ana', role: 'SECTOR_ADMIN', sectorId: 1 };
const viewerPA: AuthUser = { id: 3, name: 'Beto', role: 'VIEWER', sectorId: 1 };
const auth = (user: AuthUser) => ({ Authorization: `Bearer ${signToken(user)}` });

beforeAll(async () => {
  hash = await bcrypt.hash(SENHA, 10);
});

beforeEach(() => {
  const base = { password_hash: hash, active: true, created_at: new Date() };
  users.splice(
    0,
    users.length,
    { ...base, id: 1, name: 'Carla', email: 'carla@hospital.com', role: 'SUPER_ADMIN', sector_id: null },
    { ...base, id: 2, name: 'Ana', email: 'ana@hospital.com', role: 'SECTOR_ADMIN', sector_id: 1 },
    { ...base, id: 3, name: 'Beto', email: 'beto@hospital.com', role: 'VIEWER', sector_id: 1 },
    { ...base, id: 4, name: 'Davi', email: 'davi@hospital.com', role: 'VIEWER', sector_id: 2 },
    { ...base, id: 5, name: 'Eva', email: 'eva@hospital.com', role: 'SECTOR_ADMIN', sector_id: 2 },
  );
  sectors.splice(
    0,
    sectors.length,
    { id: 1, name: 'Pronto Atendimento', slug: 'pronto-atendimento', code: 'PA7K2Q', active: true, created_at: new Date() },
    { id: 2, name: 'Raio-X', slug: 'raio-x', code: 'RX3M9T', active: true, created_at: new Date() },
  );
});

const novo = (extra: object) => ({ name: 'Novo', email: 'novo@hospital.com', password: 'senha-inicial', ...extra });

describe('GET /api/users', () => {
  it('super admin vê todos, sem a senha', async () => {
    const response = await request(app).get('/api/users').set(auth(superAdmin));

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(5);
    expect(JSON.stringify(response.body)).not.toContain('password');
  });

  it('admin de setor só vê os visualizadores do seu setor', async () => {
    const response = await request(app).get('/api/users').set(auth(adminPA));
    expect(response.body.map((user: { name: string }) => user.name)).toEqual(['Beto']);
  });

  it('visualizador não acessa usuários (403)', async () => {
    expect((await request(app).get('/api/users').set(auth(viewerPA))).status).toBe(403);
  });
});

describe('POST /api/users', () => {
  it('super admin cadastra admin de setor; a senha é guardada embaralhada', async () => {
    const response = await request(app)
      .post('/api/users')
      .set(auth(superAdmin))
      .send(novo({ role: 'SECTOR_ADMIN', sectorId: 2 }));

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ name: 'Novo', role: 'SECTOR_ADMIN', sectorId: 2, active: true });
    const saved = users.find((user) => user.email === 'novo@hospital.com')!;
    expect(saved.password_hash).not.toBe('senha-inicial');
    expect(await bcrypt.compare('senha-inicial', saved.password_hash)).toBe(true);
  });

  it('super admin cadastra outro super admin, sempre sem setor (decisão da dupla)', async () => {
    const response = await request(app)
      .post('/api/users')
      .set(auth(superAdmin))
      .send(novo({ role: 'SUPER_ADMIN', sectorId: 1 }));

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ role: 'SUPER_ADMIN', sectorId: null });
  });

  it('admin de setor e visualizador precisam de setor', async () => {
    const response = await request(app).post('/api/users').set(auth(superAdmin)).send(novo({ role: 'VIEWER' }));
    expect(response.status).toBe(400);
  });

  it('setor que não existe devolve 404', async () => {
    const response = await request(app)
      .post('/api/users')
      .set(auth(superAdmin))
      .send(novo({ role: 'VIEWER', sectorId: 99 }));
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('SECTOR_NOT_FOUND');
  });

  it('admin de setor cadastra visualizador no próprio setor (mesmo sem mandar o setor)', async () => {
    const response = await request(app).post('/api/users').set(auth(adminPA)).send(novo({ role: 'VIEWER' }));

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ role: 'VIEWER', sectorId: 1 });
  });

  it('admin de setor não cadastra admin nem visualizador de outro setor (403)', async () => {
    const asAdmin = await request(app).post('/api/users').set(auth(adminPA)).send(novo({ role: 'SECTOR_ADMIN', sectorId: 1 }));
    const otherSector = await request(app).post('/api/users').set(auth(adminPA)).send(novo({ role: 'VIEWER', sectorId: 2 }));

    expect(asAdmin.status).toBe(403);
    expect(otherSector.status).toBe(403);
  });

  it('e-mail repetido (mesmo com maiúsculas) devolve 409', async () => {
    const response = await request(app)
      .post('/api/users')
      .set(auth(superAdmin))
      .send(novo({ email: 'ANA@hospital.com', role: 'VIEWER', sectorId: 1 }));

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('senha com menos de 8 caracteres devolve 400', async () => {
    const response = await request(app)
      .post('/api/users')
      .set(auth(superAdmin))
      .send(novo({ password: 'curta', role: 'VIEWER', sectorId: 1 }));
    expect(response.status).toBe(400);
  });
});

describe('PUT e DELETE /api/users/:id', () => {
  it('super admin muda perfil e setor de outra pessoa', async () => {
    const response = await request(app).put('/api/users/3').set(auth(superAdmin)).send({ role: 'SECTOR_ADMIN', sectorId: 2 });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ role: 'SECTOR_ADMIN', sectorId: 2 });
  });

  it('virar super admin tira o setor', async () => {
    const response = await request(app).put('/api/users/2').set(auth(superAdmin)).send({ role: 'SUPER_ADMIN' });
    expect(response.body).toMatchObject({ role: 'SUPER_ADMIN', sectorId: null });
  });

  it('redefinir a senha de outra pessoa', async () => {
    await request(app).put('/api/users/3').set(auth(superAdmin)).send({ password: 'senha-nova-123' });
    expect(await bcrypt.compare('senha-nova-123', users[2].password_hash)).toBe(true);
  });

  it('admin de setor altera visualizador do seu setor, mas não de outro setor nem outro admin', async () => {
    expect((await request(app).put('/api/users/3').set(auth(adminPA)).send({ name: 'Beto Silva' })).status).toBe(200);
    expect((await request(app).put('/api/users/4').set(auth(adminPA)).send({ name: 'X' })).status).toBe(403);
    expect((await request(app).put('/api/users/5').set(auth(adminPA)).send({ name: 'X' })).status).toBe(403);
  });

  it('admin de setor não promove visualizador a admin', async () => {
    const response = await request(app).put('/api/users/3').set(auth(adminPA)).send({ role: 'SECTOR_ADMIN' });
    expect(response.status).toBe(403);
  });

  it('ninguém desativa a si mesmo nem muda o próprio perfil (decisão da dupla)', async () => {
    expect((await request(app).delete('/api/users/1').set(auth(superAdmin))).status).toBe(403);
    expect((await request(app).put('/api/users/1').set(auth(superAdmin)).send({ active: false })).status).toBe(403);
    expect((await request(app).put('/api/users/1').set(auth(superAdmin)).send({ role: 'VIEWER', sectorId: 1 })).status).toBe(403);
    expect(users[0]).toMatchObject({ active: true, role: 'SUPER_ADMIN' });
  });

  it('mas pode mudar o próprio nome', async () => {
    const response = await request(app).put('/api/users/1').set(auth(superAdmin)).send({ name: 'Carla Souza' });
    expect(response.body.name).toBe('Carla Souza');
  });

  it('DELETE desativa sem apagar, e dá para reativar', async () => {
    const off = await request(app).delete('/api/users/4').set(auth(superAdmin));
    expect(off.body.active).toBe(false);
    expect(users).toHaveLength(5);

    const on = await request(app).put('/api/users/4').set(auth(superAdmin)).send({ active: true });
    expect(on.body.active).toBe(true);
  });

  it('usuário desativado não consegue mais entrar', async () => {
    await request(app).delete('/api/users/3').set(auth(superAdmin));
    const login = await request(app).post('/api/auth/login').send({ email: 'beto@hospital.com', password: SENHA });
    expect(login.status).toBe(401);
  });

  it('usuário que não existe devolve 404', async () => {
    const response = await request(app).put('/api/users/99').set(auth(superAdmin)).send({ name: 'X' });
    expect(response.body.error.code).toBe('USER_NOT_FOUND');
  });
});

describe('PUT /api/auth/password ("Minha senha")', () => {
  it('troca a senha quando a atual está certa; a nova passa a valer no login', async () => {
    const response = await request(app)
      .put('/api/auth/password')
      .set(auth(viewerPA))
      .send({ currentPassword: SENHA, newPassword: 'minha-senha-nova' });

    expect(response.status).toBe(200);
    const login = await request(app).post('/api/auth/login').send({ email: 'beto@hospital.com', password: 'minha-senha-nova' });
    expect(login.status).toBe(200);
  });

  it('senha atual errada devolve 400 e não troca', async () => {
    const response = await request(app)
      .put('/api/auth/password')
      .set(auth(viewerPA))
      .send({ currentPassword: 'errada', newPassword: 'minha-senha-nova' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('WRONG_PASSWORD');
    expect(await bcrypt.compare(SENHA, users[2].password_hash)).toBe(true);
  });

  it('nova senha curta devolve 400; sem login devolve 401', async () => {
    const short = await request(app).put('/api/auth/password').set(auth(viewerPA)).send({ currentPassword: SENHA, newPassword: '123' });
    const noLogin = await request(app).put('/api/auth/password').send({ currentPassword: SENHA, newPassword: 'minha-senha-nova' });

    expect(short.status).toBe(400);
    expect(noLogin.status).toBe(401);
  });
});
