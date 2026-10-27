import type { Sector } from '@avaliacoes/schemas';

// Contrato de acesso aos setores: O QUE dá para fazer, sem dizer qual banco é.
// A implementação com o Supabase está em ../supabase/sectors.repository.ts.
export interface SectorsRepository {
  // Todos os setores, ativos e inativos, em ordem alfabética.
  list(): Promise<Sector[]>;
  findById(id: number): Promise<Sector | null>;
  findBySlug(slug: string): Promise<Sector | null>;
  create(data: { name: string; slug: string }): Promise<Sector>;
  // Só o nome e a situação mudam. O link (slug) nunca muda (decisão da dupla).
  update(id: number, data: { name?: string; active?: boolean }): Promise<Sector | null>;
}
