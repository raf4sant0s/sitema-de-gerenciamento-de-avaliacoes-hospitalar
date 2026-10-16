# Plano da Pessoa B

**Responsável por:** banco de dados (SQL, Zod, acesso ao Supabase) + login e perfis + cadastros (setores, QR Code, usuários, pesquisas, escala) + comentários.
**Nome:** Rafaela

Contexto, regras (RN), decisões (D) e contratos: [README](../../README.md). Plano da colega (Estefanie): [pessoa-a.md](pessoa-a.md).

## Como usar este plano

- Faça as tarefas **na ordem**. Cada uma tem a sua branch, que sai da `develop` e volta para ela com `git merge`, sem Pull Request (README, seção 15).
- **B1, B2 e B3 são prioridade:** a Estefanie (Pessoa A) depende delas para começar a parte de API. Faça essas três antes dos documentos, se precisar.
- **Depende de** diz quais tarefas da Pessoa A precisam estar na `develop` antes de começar.
- Ao terminar uma tarefa, troque `[ ]` por `[x]` **no mesmo commit** e o Claude escreve a linha em `docs/registro-processo.md`.
- Itens **(a definir)** precisam ser decididos pela dupla antes de implementar.

## Etapa 1 — Base (prioridade)

- [x] **B1 · Criar a API**
  - Branch: `chore/api-base`
  - O que fazer: `package.json` na raiz com workspaces (`apps/*` e `packages/*`); projeto Node + Express + TypeScript em `apps/api`; `src/config/` lendo o `.env`; `.env.example`; formato padrão de erro (`src/shared/errors.ts`); rota `GET /api/health`; Swagger em `/api/docs`.
  - Arquivos compartilhados (avisar a Pessoa A): `package.json` da raiz, `apps/api/package.json`, `app.ts`, `server.ts`.
  - Commit: `chore(api): cria projeto da api`
  - Pronto quando: `npm run dev` sobe a API e `/api/docs` abre no navegador.

- [x] **B2 · Tabelas do banco**
  - Branch: `feat/banco-tabelas`
  - O que fazer: `database/migrations/001_cria_tabelas.sql` com todas as tabelas, tipos, chaves e índices da seção 8 do README, em SQL padrão (sem recursos exclusivos do Supabase); rodar no Supabase; conexão com `pg` em `apps/api/src/database/supabase/connection.ts`.
  - O banco é **um só** para as duas (README, seção 12). Depois de rodar a migration, passe o `DATABASE_URL` para a Estefanie por mensagem privada, nunca pelo git.
  - Commit: `feat(db): cria tabelas`
  - Pronto quando: as tabelas aparecem no Supabase e a API consegue se conectar.

- [x] **B3 · Schemas Zod**
  - Branch: `feat/schemas-zod`
  - Depende de: B2
  - O que fazer: em `packages/schemas/src/`, um arquivo por tabela com os mesmos campos e regras do SQL (ex.: `value` de 1 a 5), exportando também os tipos TypeScript.
  - Commit: `feat(schemas): schemas zod das tabelas`

## Etapa 2 — Documentos e design

- [x] **B4 · Persona do gestor**
  - Branch: `docs/persona-gestor`
  - O que fazer: em `docs/personas.md`, seção "Gestão": nome fictício, idade, contexto, objetivos, dores, familiaridade com tecnologia, canal preferido e uma frase que represente a visão dele(a).
  - Commit: `docs: persona do gestor`

- [x] **B5 · Decisões D4, D5 e D8**
  - Branch: `docs/decisoes-gestao`
  - O que fazer: em `docs/decisoes.md`, escrever cada decisão com o porquê, ligando-a à persona do gestor. As justificativas aprovadas pela dupla estão no README (seção 4); aqui elas são explicadas com mais detalhe.
  - Commit: `docs: decisoes da gestao`

- [x] **B6 · Requisitos e matriz de rastreabilidade**
  - Branch: `docs/requisitos`
  - O que fazer: `docs/requisitos.md` ligando cada pedido do briefing a um requisito (RF), à regra (RN), à tela, à rota da API e ao teste.
  - Commit: `docs: requisitos e rastreabilidade`

- [x] **B7 · Relatório do banco**
  - Branch: `docs/relatorio-banco`
  - O que fazer: `docs/banco-de-dados.md` explicando por que SQL e não NoSQL, por que Supabase, como o banco pode ser trocado, e os modelos conceitual e lógico.
  - Commit: `docs: relatorio do banco`

- [ ] **B8 · Figma e mock da gestão** (fora do git)
  - O que fazer: fluxo login → menu → cadastros → comentários; telas em alta fidelidade de login, setores, usuários, pesquisas, escala e comentários, seguindo o guia de estilos da Pessoa A.

## Etapa 3 — Login e perfis

- [x] **B9 · Login e perfis na API**
  - Branch: `feat/auth`
  - Depende de: B1, B2, B3
  - O que fazer: módulo `auth` (`POST /auth/login`, `GET /auth/me`) com JWT e bcrypt; repositório de usuários; middlewares `requireAuth` e `requireRole` em `src/shared/`; regra de que admin de setor e visualizador só acessam o próprio setor (RN16).
  - Commit: `feat(auth): login e perfis`
  - Pronto quando: login devolve o token e há testes de permissão para os 3 perfis.

- [x] **B10 · Login e menu no site de gestão**
  - Branch: `feat/gestao-login-menu`
  - Depende de: A6, B9
  - O que fazer: tela `/login`; guardar o token; layout com o menu conforme o perfil (`components/layout/`); a aba TV Wall só aparece para o super admin; bloquear telas que o perfil não pode ver.
  - Commit: `feat(gestao): login e menu por perfil`

## Etapa 4 — Cadastros e comentários

- [x] **B11 · Setores e QR Code**
  - Branch: `feat/setores`
  - Depende de: B10
  - O que fazer: rotas de `/sectors` (seção 9) com geração do código de 6 caracteres e do QR Code; tela `/setores`. Os slugs `login`, `c` e `tv` são proibidos.
  - Regras: RN01, RN16
  - Commit: `feat(sectors): setores e qr code`

- [x] **B12 · Usuários**
  - Branch: `feat/usuarios`
  - Depende de: B10
  - O que fazer: rotas de `/users` e tela `/usuarios`. O super admin cadastra todos; o admin de setor só cadastra visualizadores do próprio setor (RN16).
  - Commit: `feat(users): cadastro de usuarios`

- [x] **B13 · Pesquisas e perguntas**
  - Branch: `feat/pesquisas`
  - Depende de: B10
  - O que fazer: rotas de `/surveys` e `/questions` com reordenação; tela `/pesquisas`. Só uma pesquisa ativa por setor (RN02) e só uma pergunta obrigatória por pesquisa (RN05).
  - Commit: `feat(surveys): pesquisas e perguntas`

- [x] **B14 · Equipes e escala**
  - Branch: `feat/escala`
  - Depende de: B10
  - O que fazer: rotas de `/teams` e `/schedules`; tela `/escala` para cadastrar a equipe de cada setor, data e turno do mês (RN14). O visualizador só vê.
  - Commit: `feat(schedules): equipes e escala`

- [x] **B15 · Comentários**
  - Branch: `feat/comentarios`
  - Depende de: B10
  - O que fazer: rotas de `/comments`; tela `/comentarios` com filtros (setor, tipo, status, data) e a ação "marcar como tratado" com o campo do que foi feito (RN17). Visualizador só lê.
  - Commit: `feat(comments): lista e tratamento de comentarios`

## Etapa 5 — Testes

- [x] **B16 · Testes da gestão**
  - Branch: `test/gestao`
  - O que fazer: testes de integração de login, permissões dos 3 perfis, cadastros e comentários.
  - Commit: `test: gestao`

- [x] **B17 · Swagger das suas rotas e relatório de testes**
  - Branch: `docs/swagger-gestao`
  - O que fazer: documentar no Swagger as rotas de login, cadastros e comentários; `docs/testes.md` com o plano e o resultado dos testes dos dois.
  - Commit: `docs: swagger da gestao e relatorio de testes`

## Etapa 6 — Entrega

- [ ] **B18 · Manual de uso**
  - Branch: `docs/manual-gestao`
  - O que fazer: em `docs/manual/`, como entrar, cadastrar setores, usuários, pesquisas e escala, e tratar comentários, com prints do sistema publicado e linguagem para leigos.
  - Commit: `docs: manual da gestao`
- [ ] **B19 · Juntos:** registro do processo completo, PDF de entrega e ensaio de 8 minutos (B apresenta o login, os cadastros, os comentários e a arquitetura).
