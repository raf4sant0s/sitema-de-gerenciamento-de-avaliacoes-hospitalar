import type { Sector, User } from '@avaliacoes/schemas';
import type { SectorsRepository } from '../src/database/repositories/sectors.repository';
import type { UsersRepository } from '../src/database/repositories/users.repository';

// "Bancos de mentira" só na memória, para os testes não tocarem no Supabase.
// Cada função recebe a lista (que o teste pode mudar) e devolve um repositório que lê e grava nela.

export function fakeUsersRepository(users: User[]): UsersRepository {
  return {
    async findByEmail(email) {
      return users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
    },
    async findById(id) {
      return users.find((user) => user.id === id) ?? null;
    },
    async list() {
      return [...users].sort((a, b) => a.name.localeCompare(b.name));
    },
    async create(data) {
      const user: User = {
        id: Math.max(0, ...users.map((item) => item.id)) + 1,
        name: data.name,
        email: data.email,
        password_hash: data.passwordHash,
        role: data.role,
        sector_id: data.sectorId,
        active: true,
        created_at: new Date(),
      };
      users.push(user);
      return user;
    },
    async update(id, changes) {
      const user = users.find((item) => item.id === id);
      if (!user) return null;
      if (changes.name !== undefined) user.name = changes.name;
      if (changes.email !== undefined) user.email = changes.email;
      if (changes.passwordHash !== undefined) user.password_hash = changes.passwordHash;
      if (changes.role !== undefined) user.role = changes.role;
      if (changes.sectorId !== undefined) user.sector_id = changes.sectorId;
      if (changes.active !== undefined) user.active = changes.active;
      return user;
    },
  };
}

export function fakeSectorsRepository(sectors: Sector[]): SectorsRepository {
  return {
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
      if (data.name !== undefined) sector.name = data.name;
      if (data.active !== undefined) sector.active = data.active;
      return sector;
    },
  };
}
