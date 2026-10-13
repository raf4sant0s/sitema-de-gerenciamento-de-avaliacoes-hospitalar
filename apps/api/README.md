# apps/api

Back-end do sistema. É a **única** parte que conversa com o banco de dados (Supabase).

Para trocar de banco no futuro, só a pasta `src/database/` muda; o resto da API continua igual.

| Pasta | Para que serve |
| --- | --- |
| `src/config/` | Leitura das variáveis de ambiente (`.env`) |
| `src/database/repositories/` | Os "contratos" de acesso ao banco: quais operações existem (ex.: buscar setor, salvar resposta), sem dizer qual banco é |
| `src/database/supabase/` | A implementação desses contratos usando o Supabase |
| `src/modules/` | Uma pasta por assunto da API (rotas, regras e validação) |
| `src/shared/` | Código usado por vários módulos (erros, middlewares de login e perfil) |
| `tests/` | Testes automatizados da API |
