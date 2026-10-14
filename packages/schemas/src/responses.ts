import { z } from 'zod';
import { dateOnlySchema, faceValueSchema, idSchema, timestampSchema } from './common';
import { responseStatusSchema, shiftSchema } from './enums';

// Tabela responses (README, seção 8).
// RN08: 100% anônima, nenhum campo guarda dado pessoal do paciente.
// RN09/RN10: começa PARTIAL; vira COMPLETE no agradecimento ou ABANDONED depois de 30 min parada.
// RN12/RN13: guarda setor, data e hora (created_at) e o turno.
export const responseSchema = z.object({
  id: z.uuid(),
  sector_id: idSchema,
  survey_id: idSchema,
  shift_date: dateOnlySchema,
  shift: shiftSchema,
  team_id: idSchema.nullable(),
  status: responseStatusSchema,
  overall_score: faceValueSchema.nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
  completed_at: timestampSchema.nullable(),
});

// "SurveyResponse" (e não "Response") para não confundir com o Response do fetch do navegador.
export type SurveyResponse = z.infer<typeof responseSchema>;
