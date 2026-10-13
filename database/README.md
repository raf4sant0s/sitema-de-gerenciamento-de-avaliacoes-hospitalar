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
