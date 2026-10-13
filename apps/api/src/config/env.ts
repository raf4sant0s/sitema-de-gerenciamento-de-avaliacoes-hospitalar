import 'dotenv/config';
import { z } from 'zod';

// Lê as variáveis do arquivo .env e confere se estão certas antes de a API subir.
// Se faltar alguma obrigatória, a API para com uma mensagem dizendo qual é.
// As variáveis do banco (DATABASE_URL) e do login (JWT_SECRET) entram aqui nas tarefas B2 e B9.
const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3333),
  // Endereços dos dois sites, separados por vírgula. Só eles podem chamar a API.
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173,http://localhost:5174')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    ),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Variáveis de ambiente inválidas no arquivo .env:');
  console.error(z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
