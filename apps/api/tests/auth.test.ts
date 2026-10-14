import type { User } from '@avaliacoes/schemas';
import bcrypt from 'bcryptjs';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { type AuthUser, canAccessSector, requireAuth, requireRole, signToken } from '../src/shared/auth';
import { errorHandler } from '../src/shared/errors';
import { fakeUsersRepository } from './fakes';

// "Banco de mentira" só na memória: os testes não tocam no Supabase.
const PASSWORD = 'senha-de-teste-123';
const users: User[] = [];

const app = createApp({ users: fakeUsersRepository(users) });

beforeAll(async () => {
  const password_hash = await bcrypt.hash(PASSWORD, 10);
  const base = { password_hash, active: true, created_at: new Date() };
  users.push(
    { ...base, id: 1, name: 'Super Admin', email: 'super@hospital.com', role: 'SUPER_ADMIN', sector_id: null },
    { ...base, id: 2, name: 'Admin do PA', email: 'admin.pa@hospital.com', role: 'SECTOR_ADMIN', sector_id: 10 },
    { ...base, id: 3, name: 'Visualizador do PA', email: 'viewer.pa@hospital.com', role: 'VIEWER', sector_id: 10 },
    { ...base, id: 4, name: 'Desativado', email: 'antigo@hospital.com', role: 'VIEWER', sector_id: 10, active: false },
  );
});

describe('POST /api/auth/login', () => {
  it('com e-mail e senha certos devolve o token e o usuário, sem a senha', async () => {
    const response = await request(app).post('/api/auth/login').send({ email: 'admin.pa@hospital.com', password: PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body.user).toEqual({ id: 2, name: 'Admin do PA', role: 'SECTOR_ADMIN', sectorId: 10 });
    expect(typeof response.body.token).toBe('string');
    expect(JSON.stringify(response.body)).not.toContain('password');
  });

  it('o token vence em 8 horas', async () => {
    const response = await request(app).post('/api/auth/login').send({ email: 'super@hospital.com', password: PASSWORD });
    const payload = jwt.decode(response.body.token) as jwt.JwtPayload;

    expect(payload.exp! - payload.iat!).toBe(8 * 60 * 60);
  });

  it('aceita o e-mail com letras maiúsculas', async () => {
    const response = await request(app).post('/api/auth/login').send({ email: 'SUPER@Hospital.com', password: PASSWORD });
    expect(response.status).toBe(200);
  });

  it('senha errada, e-mail inexistente e usuário desativado recebem a mesma resposta 401', async () => {
    const attempts = [
      { email: 'admin.pa@hospital.com', password: 'senha-errada' },
      { email: 'ninguem@hospital.com', password: PASSWORD },
      { email: 'antigo@hospital.com', password: PASSWORD },
    ];

    for (const body of attempts) {
      const response = await request(app).post('/api/auth/login').send(body);
      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: { code: 'INVALID_CREDENTIALS', message: 'E-mail ou senha incorretos' } });
    }
  });

  it('corpo sem e-mail válido devolve 400', async () => {
    const response = await request(app).post('/api/auth/login').send({ email: 'nao-e-email', password: PASSWORD });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/auth/me', () => {
  it('sem token devolve 401', async () => {
    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('com token inválido devolve 401', async () => {
    const response = await request(app).get('/api/auth/me').set('Authorization', 'Bearer token-falso');
    expect(response.status).toBe(401);
  });

  it('com token vencido devolve 401', async () => {
    const expired = jwt.sign({ name: 'X', role: 'VIEWER', sectorId: 10 }, process.env.JWT_SECRET!, {
      subject: '3',
      expiresIn: -10,
    });
    const response = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${expired}`);
    expect(response.status).toBe(401);
  });

  it('com token válido devolve quem está logado', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: 'viewer.pa@hospital.com', password: PASSWORD });
    const response = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${login.body.token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ user: { id: 3, name: 'Visualizador do PA', role: 'VIEWER', sectorId: 10 } });
  });

  it('usuário desativado depois do login perde o acesso', async () => {
    const token = signToken({ id: 4, name: 'Desativado', role: 'VIEWER', sectorId: 10 });
    const response = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(401);
  });
});

describe('perfis (RN16)', () => {
  const superAdmin: AuthUser = { id: 1, name: 'S', role: 'SUPER_ADMIN', sectorId: null };
  const sectorAdmin: AuthUser = { id: 2, name: 'A', role: 'SECTOR_ADMIN', sectorId: 10 };
  const viewer: AuthUser = { id: 3, name: 'V', role: 'VIEWER', sectorId: 10 };

  // API pequena só para testar o requireRole: rota que só o super admin pode usar.
  const testApp = express();
  testApp.get('/so-super-admin', requireAuth, requireRole('SUPER_ADMIN'), (_req, res) => {
    res.json({ ok: true });
  });
  testApp.use(errorHandler);

  it('super admin passa numa rota só de super admin', async () => {
    const response = await request(testApp).get('/so-super-admin').set('Authorization', `Bearer ${signToken(superAdmin)}`);
    expect(response.status).toBe(200);
  });

  it('admin de setor e visualizador são barrados com 403', async () => {
    for (const user of [sectorAdmin, viewer]) {
      const response = await request(testApp).get('/so-super-admin').set('Authorization', `Bearer ${signToken(user)}`);
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    }
  });

  it('super admin acessa qualquer setor', () => {
    expect(canAccessSector(superAdmin, 10)).toBe(true);
    expect(canAccessSector(superAdmin, 99)).toBe(true);
  });

  it('admin de setor e visualizador só acessam o próprio setor', () => {
    expect(canAccessSector(sectorAdmin, 10)).toBe(true);
    expect(canAccessSector(sectorAdmin, 99)).toBe(false);
    expect(canAccessSector(viewer, 10)).toBe(true);
    expect(canAccessSector(viewer, 99)).toBe(false);
  });
});
