# packages/schemas (`@avaliacoes/schemas`)

Schemas de validação no código (Zod), **um arquivo por tabela** do banco, com os mesmos campos (em `snake_case`) e as mesmas regras do SQL de `database/migrations/`. Cada arquivo também exporta o tipo TypeScript da tabela.

| Arquivo | Tabela | Tipo exportado |
| --- | --- | --- |
| `src/enums.ts` | Tipos fixos (perfil, etapa, turno, status, tipo de comentário) | `Role`, `JourneyStep`, `Shift`, `ResponseStatus`, `CommentType`, `CommentStatus` |
| `src/common.ts` | Peças repetidas (id, data, carinha de 1 a 5) | — |
| `src/sectors.ts` | `sectors` | `Sector` |
| `src/users.ts` | `users` | `User` |
| `src/surveys.ts` | `surveys` | `Survey` |
| `src/questions.ts` | `questions` | `Question` |
| `src/teams.ts` | `teams` | `Team` |
| `src/schedules.ts` | `schedules` | `Schedule` |
| `src/responses.ts` | `responses` | `SurveyResponse` |
| `src/answers.ts` | `answers` | `Answer` |
| `src/comments.ts` | `comments` | `PatientComment` |

## Como usar

Na API e nos dois sites:

```ts
import { faceValueSchema, type Sector } from '@avaliacoes/schemas';

faceValueSchema.safeParse(4).success; // true: carinha de 1 a 5 (RN04)
```

O pacote é usado direto do TypeScript (sem etapa de build): a API roda com `tsx` e os sites com o Vite, e os dois entendem TypeScript.

Datas: colunas `TIMESTAMPTZ` são `Date`; colunas `DATE` (como `shift_date`) são texto `AAAA-MM-DD`, para o fuso horário não trocar o dia (RN13).

## Regras

- Toda tabela nova ganha uma migration em `database/migrations/` **e** um arquivo aqui, com os mesmos campos.
- Mudou uma coluna no SQL? Mude aqui no mesmo commit.

## Testes

```bash
npm run test:schemas
```
