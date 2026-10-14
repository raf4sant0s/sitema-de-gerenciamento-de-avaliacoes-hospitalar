import { z } from 'zod';
import { idSchema } from './common';

// Tabela teams (README, seção 8). RN15: a avaliação é ligada à equipe, nunca a uma pessoa.
export const teamSchema = z.object({
  id: idSchema,
  sector_id: idSchema,
  name: z.string().min(1),
});

export type Team = z.infer<typeof teamSchema>;
