import { sectorSchema, type Sector } from '@avaliacoes/schemas';
import type { SectorsRepository } from '../repositories/sectors.repository';
import type { Pool } from 'pg';
import { getPool } from './connection';

const columns = 'id, name, slug, code, active, created_at';

// Implementação do SectorsRepository com SQL puro no PostgreSQL do Supabase.
// Recebe uma função que devolve o banco: a API usa o Supabase; os testes, um PostgreSQL em memória (PGlite).
export class SupabaseSectorsRepository implements SectorsRepository {
  constructor(private readonly db: () => Pool = getPool) {}

  async list(): Promise<Sector[]> {
    const result = await this.db().query(`SELECT ${columns} FROM sectors ORDER BY name`);
    return result.rows.map((row) => sectorSchema.parse(row));
  }

  async findById(id: number): Promise<Sector | null> {
    return this.findOne('id = $1', id);
  }

  async findBySlug(slug: string): Promise<Sector | null> {
    return this.findOne('slug = $1', slug);
  }

  async findByCode(code: string): Promise<Sector | null> {
    return this.findOne('code = $1', code);
  }

  async create(data: { name: string; slug: string; code: string }): Promise<Sector> {
    const result = await this.db().query(
      `INSERT INTO sectors (name, slug, code) VALUES ($1, $2, $3) RETURNING ${columns}`,
      [data.name, data.slug, data.code],
    );
    return sectorSchema.parse(result.rows[0]);
  }

  async update(id: number, data: { name?: string; active?: boolean }): Promise<Sector | null> {
    // COALESCE: se o campo não veio, mantém o valor que já estava no banco.
    const result = await this.db().query(
      `UPDATE sectors SET name = COALESCE($2, name), active = COALESCE($3, active)
       WHERE id = $1 RETURNING ${columns}`,
      [id, data.name ?? null, data.active ?? null],
    );
    return result.rows[0] ? sectorSchema.parse(result.rows[0]) : null;
  }

  private async findOne(where: string, value: unknown): Promise<Sector | null> {
    const result = await this.db().query(`SELECT ${columns} FROM sectors WHERE ${where}`, [value]);
    return result.rows[0] ? sectorSchema.parse(result.rows[0]) : null;
  }
}
