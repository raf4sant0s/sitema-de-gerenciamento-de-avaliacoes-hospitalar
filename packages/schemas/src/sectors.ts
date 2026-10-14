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
