import { z } from 'zod';
import { idSchema, timestampSchema } from './common';
import { roleSchema } from './enums';

// Tabela users (README, seção 8). RN16: três perfis.
export const userSchema = z
  .object({
    id: idSchema,
    name: z.string().min(1),
    email: z.email(),
    password_hash: z.string().min(1),
    role: roleSchema,
    sector_id: idSchema.nullable(),
    active: z.boolean(),
    created_at: timestampSchema,
  })
  // Mesma regra do CHECK users_sector_by_role no SQL:
  // o super admin não tem setor; admin de setor e visualizador precisam ter.
  .refine((user) => (user.role === 'SUPER_ADMIN') === (user.sector_id === null), {
    message: 'Super admin não tem setor; admin de setor e visualizador precisam de um setor',
    path: ['sector_id'],
  });

export type User = z.infer<typeof userSchema>;
