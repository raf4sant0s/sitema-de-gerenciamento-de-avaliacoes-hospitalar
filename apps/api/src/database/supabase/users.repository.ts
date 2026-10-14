import { userSchema, type User } from '@avaliacoes/schemas';
import type { UsersRepository } from '../repositories/users.repository';
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
}
