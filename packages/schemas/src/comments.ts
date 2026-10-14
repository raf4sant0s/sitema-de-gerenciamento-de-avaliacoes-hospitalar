import { z } from 'zod';
import { idSchema, timestampSchema } from './common';
import { commentStatusSchema, commentTypeSchema } from './enums';

// Tabela comments (README, seção 8).
// RN11: comentário anônimo, com tipo opcional.
// RN17: os admins marcam como tratado e anotam o que foi feito.
export const commentSchema = z.object({
  id: idSchema,
  response_id: z.uuid(),
  type: commentTypeSchema.nullable(),
  text: z.string().min(1),
  status: commentStatusSchema,
  treatment_note: z.string().nullable(),
  treated_by: idSchema.nullable(),
  treated_at: timestampSchema.nullable(),
  created_at: timestampSchema,
});

// "PatientComment" (e não "Comment") para não confundir com o Comment do navegador.
export type PatientComment = z.infer<typeof commentSchema>;
