import 'dotenv/config';
import { z } from 'zod';

// Lê as variáveis do arquivo .env e confere se estão certas antes de a API subir.
// Se faltar alguma obrigatória, a API para com uma mensagem dizendo qual é.
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
  // Endereço de conexão do banco (Supabase). Fica opcional aqui para a API e os testes
  // que não usam o banco funcionarem sem ele; quem precisa do banco confere se ele existe
  // (ver database/supabase/connection.ts).
  // Se a linha estiver vazia (DATABASE_URL=), conta como "não informado".
  DATABASE_URL: z
    .string()
    .optional()
    .transform((value) => (value ? value : undefined)),
  // Segredo que assina o "crachá" (token) do login. Texto longo e aleatório.
  // Quem souber este segredo consegue criar crachás falsos: nunca vai para o git.
  JWT_SECRET: z.string().min(32, 'JWT_SECRET precisa ter pelo menos 32 caracteres'),
  // Endereço do site da pesquisa (apps/pesquisa). É o que vai dentro do QR Code de cada setor (RN01).
  // No computador é o localhost; quando o site for publicado, troca para o endereço público.
  SURVEY_SITE_URL: z
    .url()
    .default('http://localhost:5173')
    .transform((url) => url.replace(/\/+$/, '')), // tira a barra do fim, se tiver
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Variáveis de ambiente inválidas no arquivo .env:');
  console.error(z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
