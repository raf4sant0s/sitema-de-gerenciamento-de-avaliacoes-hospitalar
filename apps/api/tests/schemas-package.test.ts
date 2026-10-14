import { faceValueSchema, roleSchema } from '@avaliacoes/schemas';
import { describe, expect, it } from 'vitest';

// Confere que a API consegue usar o pacote compartilhado de schemas (packages/schemas).
describe('pacote @avaliacoes/schemas dentro da API', () => {
  it('valida carinha de 1 a 5 (RN04) e os perfis (RN16)', () => {
    expect(faceValueSchema.safeParse(3).success).toBe(true);
    expect(faceValueSchema.safeParse(7).success).toBe(false);
    expect(roleSchema.options).toEqual(['SUPER_ADMIN', 'SECTOR_ADMIN', 'VIEWER']);
  });
});
