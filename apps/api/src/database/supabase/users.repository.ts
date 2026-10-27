import { userSchema, type User } from '@avaliacoes/schemas';
import type { NewUser, UserChanges, UsersRepository } from '../repositories/users.repository';
import type { Pool } from 'pg';
import { getPool } from './connection';

const columns = 'id, name, email, password_hash, role, sector_id, active, created_at';

// Implementação do UsersRepository com SQL puro no PostgreSQL do Supabase.
// Recebe uma função que devolve o banco: a API usa o Supabase; os testes, um PostgreSQL em memória (PGlite).
export class SupabaseUsersRepository implements UsersRepository {
  constructor(private readonly db: () => Pool = getPool) {}

  async findByEmail(email: string): Promise<User | null> {
    // E-mail comparado sem diferenciar maiúsculas e minúsculas.
    const result = await this.db().query(`SELECT ${columns} FROM users WHERE LOWER(email) = LOWER($1)`, [email]);
    return result.rows[0] ? userSchema.parse(result.rows[0]) : null;
  }

  async findById(id: number): Promise<User | null> {
    const result = await this.db().query(`SELECT ${columns} FROM users WHERE id = $1`, [id]);
    return result.rows[0] ? userSchema.parse(result.rows[0]) : null;
  }

  async list(): Promise<User[]> {
    const result = await this.db().query(`SELECT ${columns} FROM users ORDER BY name`);
    return result.rows.map((row) => userSchema.parse(row));
  }

  async create(data: NewUser): Promise<User> {
    const result = await this.db().query(
      `INSERT INTO users (name, email, password_hash, role, sector_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING ${columns}`,
      [data.name, data.email, data.passwordHash, data.role, data.sectorId],
    );
    return userSchema.parse(result.rows[0]);
  }

  async update(id: number, changes: UserChanges): Promise<User | null> {
    // Só atualiza as colunas que vieram. sector_id pode virar null (super admin não tem setor).
    const map: [keyof UserChanges, string][] = [
      ['name', 'name'],
      ['email', 'email'],
      ['passwordHash', 'password_hash'],
      ['role', 'role'],
      ['sectorId', 'sector_id'],
      ['active', 'active'],
    ];
    const sets: string[] = [];
    const values: unknown[] = [id];
    for (const [field, column] of map) {
      if (changes[field] !== undefined) {
        values.push(changes[field]);
        sets.push(`${column} = $${values.length}`);
      }
    }
    if (sets.length === 0) return this.findById(id);

    const result = await this.db().query(`UPDATE users SET ${sets.join(', ')} WHERE id = $1 RETURNING ${columns}`, values);
    return result.rows[0] ? userSchema.parse(result.rows[0]) : null;
  }
}
