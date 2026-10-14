import { type Role, userSchema, type User } from '@avaliacoes/schemas';
import type { NewUser, UserChanges, UsersRepository } from '../repositories/users.repository';
import { getPool } from './connection';

const columns = 'id, name, email, password_hash, role, sector_id, active, created_at';

// Implementação do UsersRepository com SQL puro no PostgreSQL do Supabase.
export class SupabaseUsersRepository implements UsersRepository {
  async findByEmail(email: string): Promise<User | null> {
    // E-mail comparado sem diferenciar maiúsculas e minúsculas.
    const result = await getPool().query(`SELECT ${columns} FROM users WHERE LOWER(email) = LOWER($1)`, [email]);
    return result.rows[0] ? userSchema.parse(result.rows[0]) : null;
  }

  async findById(id: number): Promise<User | null> {
    const result = await getPool().query(`SELECT ${columns} FROM users WHERE id = $1`, [id]);
    return result.rows[0] ? userSchema.parse(result.rows[0]) : null;
  }

  async list(filter: { sectorId?: number; role?: Role } = {}): Promise<User[]> {
    // Monta o WHERE só com os filtros que vieram. Os valores vão como $1, $2 (nunca colados no SQL).
    const conditions: string[] = [];
    const values: unknown[] = [];
    if (filter.sectorId !== undefined) {
      values.push(filter.sectorId);
      conditions.push(`sector_id = $${values.length}`);
    }
    if (filter.role !== undefined) {
      values.push(filter.role);
      conditions.push(`role = $${values.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await getPool().query(`SELECT ${columns} FROM users ${where} ORDER BY name`, values);
    return result.rows.map((row) => userSchema.parse(row));
  }

  async create(data: NewUser): Promise<User> {
    const result = await getPool().query(
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

    const result = await getPool().query(`UPDATE users SET ${sets.join(', ')} WHERE id = $1 RETURNING ${columns}`, values);
    return result.rows[0] ? userSchema.parse(result.rows[0]) : null;
  }
}
