import { z } from 'zod';
import { idSchema, timestampSchema } from './common';

// Tabela surveys (README, seção 8).
// RN02: só uma pesquisa ativa por setor (regra garantida pelo banco, índice surveys_one_active_per_sector).
export const surveySchema = z.object({
  id: idSchema,
  sector_id: idSchema,
  title: z.string().min(1),
  active: z.boolean(),
  created_at: timestampSchema,
});

export type Survey = z.infer<typeof surveySchema>;
