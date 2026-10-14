import { z } from 'zod';
import { dateOnlySchema, idSchema } from './common';
import { shiftSchema } from './enums';

// Tabela schedules (README, seção 8).
// RN14: para cada setor + data do plantão + turno existe uma equipe
// (uma só por combinação, garantido pelo banco).
export const scheduleSchema = z.object({
  id: idSchema,
  sector_id: idSchema,
  shift_date: dateOnlySchema,
  shift: shiftSchema,
  team_id: idSchema,
});

export type Schedule = z.infer<typeof scheduleSchema>;
