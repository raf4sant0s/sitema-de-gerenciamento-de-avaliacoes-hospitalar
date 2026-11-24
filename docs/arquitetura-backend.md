# Arquitetura do backend

Descrição da arquitetura da API, dos padrões de projeto usados e das escolhas de **qualidade**, **segurança** e **escalabilidade**. Entregável da disciplina de Criação de Sites. O contrato completo (tabelas, rotas e erros) está no [README](../README.md), seções 8 e 9.

## 1. Visão geral

```
Site da pesquisa (apps/pesquisa) ─┐
                                  ├──► API (apps/api) ──► PostgreSQL (Supabase)
Site de gestão  (apps/gestao)  ───┘        │
                                           └──► Socket.IO (tempo real)
```

- **Tecnologias:** Node.js, Express 5, TypeScript, PostgreSQL (Supabase, acessado com `pg`), Zod, JWT + bcrypt, Socket.IO e Swagger (swagger-jsdoc + swagger-ui-express).
- **Regra central:** os sites **nunca** acessam o banco. Tudo passa pela API, que é o único ponto de acesso aos dados.
- **Documentação online:** `/api/docs` (Swagger), publicada em https://sitema-de-gerenciamento-de-avaliacoes.onrender.com/api/docs

## 2. Organização em camadas

Cada funcionalidade é um **módulo** em `apps/api/src/modules/`: `auth`, `sectors`, `users`, `surveys`, `responses`, `schedules`, `comments` e `dashboard`. Todos seguem as mesmas camadas:

| Camada | Arquivo | Responsabilidade |
| --- | --- | --- |
| Rotas | `<modulo>.routes.ts` | Endereços, login e perfil exigidos, documentação Swagger |
| Controller | `<modulo>.controller.ts` | Lê a requisição HTTP, valida a entrada com Zod e devolve a resposta |
| Service | `<modulo>.service.ts` | Regras de negócio (turno, mínimo de 5 respostas, permissão por setor…) |
| Repository (interface) | `database/repositories/*.ts` | O **que** o banco precisa fazer, sem dizer como |
| Repository (implementação) | `database/supabase/*.ts` | O SQL de verdade para o PostgreSQL |

Pastas de apoio:

- `shared/`: `auth.ts` (login e perfis), `errors.ts` (erro padrão), `shift.ts` (cálculo de turno), `realtime.ts` (Socket.IO) e `swagger.ts`.
- `config/env.ts`: lê e valida as variáveis de ambiente.
- Pacote `packages/schemas` (`@avaliacoes/schemas`): os schemas Zod de todas as tabelas, usados pela API e pelos dois sites.

## 3. Padrões de projeto

| Padrão | Onde | Por quê |
| --- | --- | --- |
| Arquitetura em camadas (MVC adaptado) | Rotas → Controller → Service → Repository | Cada parte tem uma responsabilidade; mudar uma não quebra as outras |
| Repository | `database/repositories/` (interfaces) e `database/supabase/` (SQL) | A regra de negócio não conhece o banco |
| Injeção de dependência | `createApp(overrides)` em `app.ts` recebe os repositórios | Os testes trocam o banco real por um falso ou em memória sem mudar o código |
| Factory | `createRepositories()` em `database/index.ts` e `create<Modulo>Router()` | Um único lugar decide qual banco a API usa |
| Middleware (cadeia de responsabilidade) | `requireAuth`, `requireRole`, `notFoundHandler`, `errorHandler` | Login, permissão e erros tratados uma vez só, para todas as rotas |
| Erro centralizado | `AppError` em `shared/errors.ts` | Todo erro sai no formato `{ "error": { "code", "message" } }` |
| Schemas compartilhados | `@avaliacoes/schemas` (Zod) | A mesma validação na API e nos sites, sem repetir código |

## 4. Qualidade e manutenibilidade

- Separação de responsabilidades: rota, controller, service e repository em arquivos diferentes.
- TypeScript em todo o projeto: erros de tipo aparecem antes de rodar.
- Todos os módulos com a mesma estrutura: quem entende um entende os outros.
- Código e nomes técnicos em inglês; textos da interface em português.
- Regras de negócio numeradas (RN01–RN23) e citadas nos comentários e nos testes, ligando código e requisito.
- Variáveis de ambiente validadas ao ligar: se faltar uma obrigatória (ex.: `JWT_SECRET`), a API não sobe e diz qual falta.
- 298 testes automáticos, com 95% das linhas da API cobertas ([plano-e-relatorio-de-testes.md](plano-e-relatorio-de-testes.md)).

## 5. Segurança

| Aspecto | Como foi feito |
| --- | --- |
| Autenticação | Login gera um token JWT assinado com `JWT_SECRET`, válido por 8 horas (um turno). O site envia `Authorization: Bearer <token>` |
| Senhas | Guardadas só como hash bcrypt. E-mail inexistente, senha errada e usuário desativado recebem a mesma mensagem, para não revelar quais contas existem |
| Autorização | `requireRole` confere o perfil em cada rota. Admin de setor e visualizador só acessam o próprio setor, conferido no service (RN16) |
| Proteção de rotas | Toda rota da gestão exige `requireAuth`. Só a pesquisa do paciente e o TV Wall são públicos, e nenhum dos dois expõe dado pessoal |
| Validação e sanitização | Toda entrada é validada com Zod antes de chegar ao service; fora do formato → erro 400 |
| SQL Injection | Todas as consultas usam parâmetros (`$1`, `$2`); nenhum valor é colado no texto do SQL |
| CORS | Só os endereços dos dois sites (`CORS_ORIGINS`) podem chamar a API |
| Segredos | Só no `.env` (bloqueado pelo `.gitignore`) e, em produção, nas variáveis de ambiente do Render |
| Erros | Erro inesperado mostra o detalhe só no log do servidor; quem chamou recebe "Erro interno do servidor" |
| Tempo real | O Socket.IO só aceita conexão com token válido, e cada perfil só recebe avisos do próprio setor |
| LGPD | Pesquisa 100% anônima: nenhuma tabela guarda dado pessoal do paciente (RN08, D3) |

## 6. Escalabilidade e desacoplamento

- **Banco substituível:** trocar de banco é criar uma pasta ao lado de `database/supabase/` e mudar só `database/index.ts`. Nenhum módulo muda.
- **Front e back separados:** os dois sites e a API são publicados de forma independente (três serviços no Render).
- **API sem estado (stateless):** o login fica no token JWT, não na memória do servidor, então várias cópias da API podem rodar ao mesmo tempo.
- **Módulos independentes:** uma funcionalidade nova vira um módulo novo, sem alterar os existentes.
- **Desempenho no banco:** índice em `responses(sector_id, shift_date, shift)` (migration 003). Com 60 mil respostas, a busca do dashboard caiu de ~4 ms para ~0,8 ms ([banco-de-dados.md](banco-de-dados.md)).
- **Tempo real eficiente:** vários avisos seguidos viram uma única atualização a cada 1 segundo.

## 7. Melhorias futuras

- Limitar tentativas de login por minuto (*rate limiting*) contra força bruta.
- Cabeçalhos de segurança HTTP com *helmet*.
- Plano pago no servidor, para a API não "dormir" quando fica parada.
