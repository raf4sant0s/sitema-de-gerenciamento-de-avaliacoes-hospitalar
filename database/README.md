# database

Schemas do banco em SQL, guardados no repositório. Banco atual: **Supabase** (PostgreSQL), compartilhado pelas duas aplicações.

| Pasta | Para que serve |
| --- | --- |
| `migrations/` | Arquivos `.sql` que criam e alteram as tabelas, numerados na ordem em que rodam (`001_...sql`, `002_...sql`) |
| `seeds/` | Arquivos `.sql` com dados de exemplo para testar |

Regras:
- Toda tabela nova ganha uma migration aqui **e** um schema em `packages/schemas/`.
- Uma migration que já rodou nunca é editada; para mudar algo, cria-se uma nova.
- SQL padrão, sem recursos exclusivos do Supabase, para facilitar trocar de banco.
- O arquivo **não** leva `BEGIN`/`COMMIT`: o comando já roda cada arquivo inteiro numa transação (ou tudo dá certo, ou nada muda).

Como rodar (na raiz do projeto, com o `DATABASE_URL` no `apps/api/.env`):

```bash
npm run db:migrate
```

O comando roda só os arquivos que ainda não rodaram e anota cada um na tabela `schema_migrations`. O banco é **o mesmo** para as duas: avise a colega antes de rodar.
