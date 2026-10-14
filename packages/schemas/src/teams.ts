import { z } from 'zod';
import { idSchema } from './common';

// Tabela teams (README, seção 8). RN15: a avaliação é ligada à equipe, nunca a uma pessoa.
// active (migration 002): equipe desativada some das opções da escala, mas o histórico continua.
export const teamSchema = z.object({
  id: idSchema,
  sector_id: idSchema,
  name: z.string().min(1),
  active: z.boolean(),
});

export type Team = z.infer<typeof teamSchema>;
