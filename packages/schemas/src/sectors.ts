import { z } from 'zod';
import { idSchema, timestampSchema } from './common';

// Tabela sectors (README, seção 8). RN01: cada setor tem um slug (link) e um código de 6 caracteres.
export const sectorSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  slug: z.string().min(1),
  code: z.string().length(6),
  active: z.boolean(),
  created_at: timestampSchema,
});

export type Sector = z.infer<typeof sectorSchema>;

// ---------------------------------------------------------------------
// Regras do link (slug) do setor, usadas pela API e pelo site de gestão (tarefa B11).
// ---------------------------------------------------------------------

// Endereços que já são telas do site da pesquisa: nenhum setor pode usar (plano, B11).
export const RESERVED_SLUGS = ['login', 'c', 'tv'];

// Link válido: só letras minúsculas sem acento, números e hífen entre as palavras.
// Exemplo: "pronto-atendimento", "raio-x", "ala-2".
export const sectorSlugSchema = z
  .string()
  .min(1, 'Informe o link do setor')
  .max(60, 'O link pode ter até 60 caracteres')
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use só letras minúsculas sem acento, números e hífen (ex.: pronto-atendimento)')
  .refine((slug) => !RESERVED_SLUGS.includes(slug), 'Este link é reservado pelo sistema. Escolha outro.');

// Cria o link a partir do nome: "Pronto Atendimento" → "pronto-atendimento", "Raio-X" → "raio-x".
// Decisão da dupla: o link nasce do nome e pode ser ajustado antes de salvar; depois não muda mais.
export function slugify(name: string): string {
  return name
    .normalize('NFD') // separa as letras dos acentos ("ã" vira "a" + "~")
    .replace(/[̀-ͯ]/g, '') // tira os acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // tudo que não é letra ou número vira hífen
    .replace(/^-+|-+$/g, '') // tira hífens do começo e do fim
    .slice(0, 60);
}
