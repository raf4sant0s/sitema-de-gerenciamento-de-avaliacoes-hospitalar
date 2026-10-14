import type { CommentStatus } from '@avaliacoes/schemas';
import type { Pool } from 'pg';
import type { CommentFilter, CommentRecord, CommentsRepository } from '../repositories/comments.repository';
import { getPool } from './connection';

// Comentário + setor (pela resposta) + quem tratou.
const select = `
  SELECT comments.id, responses.sector_id, sectors.name AS sector_name, comments.type, comments.text,
         comments.status, comments.treatment_note, comments.treated_by, users.name AS treated_by_name,
         comments.treated_at, comments.created_at
  FROM comments
  JOIN responses ON responses.id = comments.response_id
  JOIN sectors ON sectors.id = responses.sector_id
  LEFT JOIN users ON users.id = comments.treated_by`;

interface Row {
  id: number;
  sector_id: number;
  sector_name: string;
  type: CommentRecord['type'];
  text: string;
  status: CommentStatus;
  treatment_note: string | null;
  treated_by: number | null;
  treated_by_name: string | null;
  treated_at: Date | null;
  created_at: Date;
}

function toRecord(row: Row): CommentRecord {
  return {
    id: row.id,
    sectorId: row.sector_id,
    sectorName: row.sector_name,
    type: row.type,
    text: row.text,
    status: row.status,
    treatmentNote: row.treatment_note,
    treatedBy: row.treated_by ? { id: row.treated_by, name: row.treated_by_name ?? '' } : null,
    treatedAt: row.treated_at,
    createdAt: row.created_at,
  };
}

// Implementação do CommentsRepository com SQL puro no PostgreSQL do Supabase.
// Recebe uma função que devolve o banco: a API usa o Supabase; os testes, um PostgreSQL em memória (PGlite).
export class SupabaseCommentsRepository implements CommentsRepository {
  constructor(private readonly db: () => Pool = getPool) {}

  async list(filter: CommentFilter): Promise<{ items: CommentRecord[]; total: number }> {
    // Monta o WHERE só com os filtros que vieram. Os valores vão como $1, $2 (nunca colados no SQL).
    const conditions: string[] = [];
    const values: unknown[] = [];
    const add = (sql: string, value: unknown) => {
      values.push(value);
      conditions.push(sql.replace('?', `$${values.length}`));
    };
    if (filter.sectorId !== undefined) add('responses.sector_id = ?', filter.sectorId);
    if (filter.status !== undefined) add('comments.status = ?', filter.status);
    if (filter.type !== undefined) add('comments.type = ?', filter.type);
    // Dia em que o comentário chegou, no horário de Brasília.
    if (filter.from !== undefined) add(`(comments.created_at AT TIME ZONE 'America/Sao_Paulo')::date >= ?`, filter.from);
    if (filter.to !== undefined) add(`(comments.created_at AT TIME ZONE 'America/Sao_Paulo')::date <= ?`, filter.to);
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const total = await this.db().query<{ total: string }>(
      `SELECT COUNT(*) AS total FROM comments JOIN responses ON responses.id = comments.response_id ${where}`,
      values,
    );
    const rows = await this.db().query<Row>(
      `${select} ${where} ORDER BY comments.created_at DESC, comments.id DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, filter.limit, filter.offset],
    );
    return { items: rows.rows.map(toRecord), total: Number(total.rows[0].total) };
  }

  async find(id: number): Promise<CommentRecord | null> {
    const result = await this.db().query<Row>(`${select} WHERE comments.id = $1`, [id]);
    return result.rows[0] ? toRecord(result.rows[0]) : null;
  }

  async update(
    id: number,
    data: { status: CommentStatus; treatmentNote: string | null; treatedBy: number | null; treatedAt: Date | null },
  ): Promise<CommentRecord | null> {
    const result = await this.db().query(
      `UPDATE comments SET status = $2, treatment_note = $3, treated_by = $4, treated_at = $5 WHERE id = $1 RETURNING id`,
      [id, data.status, data.treatmentNote, data.treatedBy, data.treatedAt],
    );
    return result.rows[0] ? this.find(id) : null;
  }
}
