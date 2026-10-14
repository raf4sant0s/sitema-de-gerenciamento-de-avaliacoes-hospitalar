import { z } from 'zod';
import { idSchema } from './common';
import { journeyStepSchema } from './enums';

// Tabela questions (README, seção 8).
// RN04: todas são respondidas com carinhas de 1 a 5 (por isso não há coluna de tipo).
// RN05: só uma obrigatória por pesquisa (regra garantida pelo banco, índice questions_one_required_per_survey).
// RN06: cada pergunta pertence a uma etapa da jornada.
export const questionSchema = z.object({
  id: idSchema,
  survey_id: idSchema,
  position: z.number().int(),
  text: z.string().min(1),
  step: journeyStepSchema,
  required: z.boolean(),
  active: z.boolean(),
});

export type Question = z.infer<typeof questionSchema>;
