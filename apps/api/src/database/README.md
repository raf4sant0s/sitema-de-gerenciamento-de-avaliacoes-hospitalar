# apps/api/src/database

Camada que esconde o banco do resto da API.

- `repositories/`: interfaces (o que dá para fazer com os dados). Os módulos só usam estas interfaces.
- `supabase/`: código que faz essas operações no Supabase.

Se um dia trocarmos de banco, criamos uma pasta nova ao lado de `supabase/` (ex.: `postgres/`) com as mesmas operações, e trocamos qual implementação a API usa. Os módulos não mudam.
