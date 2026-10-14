import { z } from 'zod';
import { faceValueSchema, idSchema, timestampSchema } from './common';

// Tabela answers (README, seção 8).
// RN04: cada resposta é uma carinha de 1 a 5.
// RN09: uma linha por pergunta respondida (salva a cada toque).
export const answerSchema = z.object({
  id: idSchema,
  response_id: z.uuid(),
  question_id: idSchema,
  value: faceValueSchema,
  created_at: timestampSchema,
});

export type Answer = z.infer<typeof answerSchema>;
