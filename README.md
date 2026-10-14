# Sistema de Avaliação Anônima do Paciente

Pesquisa de satisfação **100% anônima** para hospital. O paciente responde pelo celular (QR Code do setor) tocando em carinhas. Os gerentes acompanham tudo num site de gestão com dashboards, comentários, escala de equipes e TV Wall.

> **Este README é a fonte única de verdade do projeto.** Ele traz o contexto, as regras, as decisões e os **contratos** (banco, API, telas) que deixam as duas pessoas da dupla trabalharem ao mesmo tempo. Se algo mudar, mude aqui primeiro ([seção 14](#14-como-mudar-um-contrato)).
>
> Itens marcados **(a definir)** ainda não foram decididos pela dupla. Não implemente nada deles sem decidir antes.

## Sumário

1. [Contexto acadêmico](#1-contexto-acadêmico)
2. [Cliente e problema](#2-cliente-e-problema)
3. [Regras de negócio](#3-regras-de-negócio)
4. [Decisões da dupla](#4-decisões-da-dupla)
5. [Requisitos](#5-requisitos)
6. [Stack](#6-stack)
7. [Arquitetura e pastas](#7-arquitetura-e-pastas)
8. [Banco de dados (contrato)](#8-banco-de-dados-contrato)
9. [API (contrato)](#9-api-contrato)
10. [Telas e rotas](#10-telas-e-rotas)
11. [Guia visual inicial](#11-guia-visual-inicial)
12. [Como rodar localmente](#12-como-rodar-localmente)
13. [Divisão de tarefas e estado do projeto](#13-divisão-de-tarefas-e-estado-do-projeto)
14. [Como mudar um contrato](#14-como-mudar-um-contrato)
15. [Git: fluxo de trabalho](#15-git-fluxo-de-trabalho)
16. [Testes](#16-testes)
17. [Publicação (deploy)](#17-publicação-deploy)
18. [Entregáveis e checklist](#18-entregáveis-e-checklist)

---

## 1. Contexto acadêmico

Projeto em **dupla**, entregue para **duas disciplinas** com o mesmo sistema:

| Disciplina | O que é avaliado |
| --- | --- |
| **Projeto Aplicado** (14 pts) | Personas (2,5) · Figma com o fluxo do paciente (2,5) · Mock alta fidelidade com as decisões indicadas (3,0) · Front publicado e fiel ao mock (3,5) · Manual de uso para leigo (1,5) · Registro do processo (1,0). Entrega: um PDF no Classroom. Apresentação: 8 min, com o sistema funcionando pelo link |
| **Desenvolvimento de Solução Web Corporativa** | Requisitos + matriz de rastreabilidade · UX/UI e guia de estilos · Relatório SQL vs NoSQL, modelos e scripts DDL/DML · Front + back modulares · API documentada (Swagger/OpenAPI) · Testes em estágios (unitário, integração, E2E) · Repositório git · Pitch |

**Fora do escopo por enquanto:** plano de negócios.

## 2. Cliente e problema

- **Cliente:** hospital regional [FHDOD](https://fhdod.com.br/).
- **Hoje:** pesquisa em papel. Cerca de 3 respostas a cada 500 atendimentos, formulários incompletos e sem data, reclamações escritas no verso, sem saber setor, turno ou equipe. Só os insatisfeitos respondem e os elogios se perdem. Horas digitando em planilhas.
- **Usuário final é leigo:** telas simples, só toques, botões grandes, linguagem simples (inclusive no manual).

## 3. Regras de negócio

Numeradas para serem citadas em código, testes e commits (ex.: `// RN07`).

### Pesquisa do paciente (site `pesquisa`)

- **RN01** Cada setor tem URL própria `/<slug>` (ex.: `/pronto-atendimento`) e um código curto `/c/<CODIGO>` (6 caracteres). Cada um gera um QR Code.
- **RN02** Uma pesquisa ativa por setor. As perguntas aparecem **uma por tela**, na ordem cadastrada.
- **RN03** **Nunca** mostrar o número de perguntas, "3 de 10" ou barra de progresso.
- **RN04** **Todas** as perguntas são respondidas com **carinhas de 1 a 5** (Péssimo, Ruim, Regular, Bom, Ótimo).
- **RN05** Existe **uma única pergunta obrigatória** por pesquisa: a avaliação geral do hospital. Ela aparece sempre na **última tela** de perguntas. Todas as outras são opcionais.
- **RN06** As perguntas opcionais são organizadas pela etapa da jornada: `RECEPCAO`, `TRIAGEM`, `ENFERMAGEM`, `MEDICO` (e `GERAL`). Cada setor só tem as etapas que fazem sentido.
- **RN07** Botão **"pular"** nas perguntas opcionais, **discreto** (link pequeno, cor neutra, abaixo das carinhas). A pergunta obrigatória não tem "pular".
- **RN08** **Pesquisa 100% anônima:** nenhum dado pessoal é pedido nem guardado (sem nome, telefone, e-mail, CPF).
- **RN09** **Salvar a cada toque.** A resposta é criada no banco no primeiro toque em qualquer carinha (status `PARTIAL`), e cada toque seguinte é salvo na hora. Se o paciente fechar o navegador, nada do que já respondeu se perde.
- **RN10** Resposta `PARTIAL` sem atividade por 30 minutos vira `ABANDONED` (rotina na API). Quando o paciente chega ao agradecimento, vira `COMPLETE`. Parciais e abandonadas **contam** nos indicadores das perguntas que foram respondidas.
- **RN11** **Comentário anônimo opcional:** a tela de comentário aparece **sempre**, para todos, no final: logo depois da pergunta obrigatória e antes do agradecimento. O paciente pode escrever um texto livre e, se quiser, marcar o tipo (elogio, reclamação ou sugestão). Pode deixar em branco e seguir.
- **RN12** Rastreabilidade gravada em toda resposta: setor, data, hora e turno. O sistema **não** diferencia se o paciente veio pelo QR Code, pelo link ou por um tablet: é tudo a mesma coisa.

### Turno, escala e equipe

- **RN13** Turnos fixos (fuso `America/Sao_Paulo`): `MANHA` 07:00–12:59, `TARDE` 13:00–18:59, `NOITE` 19:00–06:59. Uma resposta de madrugada (00:00–06:59) pertence ao plantão **noturno do dia anterior**.
- **RN14** Escala mensal cadastrada pelos admins: para cada setor + data do plantão + turno existe uma equipe. A equipe de uma resposta é encontrada cruzando setor + data do plantão + turno.
- **RN15** A avaliação é vinculada à **equipe**, nunca a uma pessoa. Indicadores por equipe só aparecem com **5 ou mais respostas** (abaixo disso: "dados insuficientes").

### Site de gestão (site `gestao`)

- **RN16** Perfis de acesso:

  | Perfil | Código | O que pode |
  | --- | --- | --- |
  | Super admin (admin master) | `SUPER_ADMIN` | Tudo, em todos os setores. Cadastra setores e admins de setor. É o **único** que vê a aba **TV Wall** |
  | Admin de setor | `SECTOR_ADMIN` | Gerencia o **seu** setor: pesquisa, escala, comentários e visualizadores do setor |
  | Visualizador | `VIEWER` | Só visualiza os dados do setor que os admins designaram para ele. Não edita nada |

- **RN17** Comentários: os gerentes leem e podem **marcar como tratado** (status `NEW` → `TREATED`), com um campo para anotar o que foi feito.
- **RN18** **TV Wall:** aba do site de gestão, visível **só para o super admin**, com os dashboards e **todos os comentários, sem exceção**.
- **RN19** Exportação em **Excel** das respostas, com os filtros aplicados.

### Indicadores

- **RN20** Nota geral = média da pergunta obrigatória (1 a 5, com 1 casa decimal) + quantas respostas houve em cada carinha.
- **RN21** Média por pergunta e por etapa da jornada: média de 1 a 5 com 1 casa decimal. Perguntas puladas não entram.
- **RN22** O dashboard filtra por período, setor, turno e equipe e permite navegar hospital → setor → turno → equipe. Atualiza em tempo real. Admin de setor e visualizador só veem o próprio setor.

## 4. Decisões da dupla

O Projeto Aplicado exige no mínimo 4 decisões justificadas, indicadas no mock e implementadas.

| # | Decisão | Por quê |
| --- | --- | --- |
| D1 | Todas as perguntas com carinhas de 1 a 5, inclusive a obrigatória | Carinhas são entendidas por qualquer pessoa, inclusive idosos e quem tem pouca leitura. Usar a mesma escala em tudo evita confusão e deixa a pesquisa mais rápida |
| D2 | A pergunta obrigatória (avaliação geral) fica na **última** tela | O paciente primeiro relembra cada etapa (recepção, enfermagem, médico) e só depois dá a nota geral, já pensando no atendimento inteiro |
| D3 | Pesquisa 100% anônima, com comentário de texto opcional | Sem dados pessoais, o paciente se sente seguro para ser sincero, e o hospital não guarda dados protegidos pela LGPD |
| D4 | Avaliação vinculada à equipe do turno pela escala, nunca a uma pessoa; mínimo de 5 respostas para mostrar a equipe | Não responsabilizar injustamente um profissional por uma avaliação isolada |
| D5 | TV Wall numa aba só do super admin, com todos os comentários sem exceção | Os comentários podem conter críticas; deixar o TV Wall restrito evita expor problemas ao público e dá à direção a visão completa, sem filtro |
| D6 | Celular via QR Code como canal principal; tablet como apoio | Custo zero e o paciente responde com calma, com privacidade |
| D7 | Salvar a cada toque | Se o paciente fechar no meio, nada se perde |
| D8 | Três perfis: super admin, admin de setor e visualizador designado a um setor | Cada gestor só vê o próprio setor. O visualizador permite mostrar os resultados a outras pessoas da equipe sem dar poder de mudar nada |

## 5. Requisitos

| ID | Requisito | Regras |
| --- | --- | --- |
| RF01 | Super admin cadastra setores e admins de setor | RN16 |
| RF02 | Admins cadastram pesquisas, perguntas e visualizadores | RN02, RN05, RN16 |
| RF03 | URL e QR Code por setor | RN01 |
| RF04 | Uma pergunta por tela, sem contador | RN02, RN03 |
| RF05 | Carinhas 1–5; uma obrigatória na última tela; pular discreto | RN04, RN05, RN07 |
| RF06 | Perguntas por etapa da jornada | RN06 |
| RF07 | Anonimato total | RN08 |
| RF08 | Salvar a cada toque; tratar abandono | RN09, RN10 |
| RF09 | Comentário anônimo opcional | RN11 |
| RF10 | Rastreabilidade (setor, data, hora, turno) | RN12, RN13 |
| RF11 | Escala mensal e cruzamento com a equipe | RN14, RN15 |
| RF12 | Perfis de acesso | RN16 |
| RF13 | Comentários: ler e marcar como tratado | RN17 |
| RF14 | Dashboard em tempo real com filtros e navegação | RN20–RN22 |
| RF15 | TV Wall só do super admin | RN18 |
| RF16 | Exportar Excel | RN19 |
| RF17 | Celular e tablet, só toques, botões grandes | Seção 11 |
| RNF01 | Banco fácil de substituir | Seções 7 e 8 |
| RNF02 | Manual simples para leigo | — |
| RNF03 | API documentada em Swagger | Seção 9 |
| RNF04 | Testes unitários, de integração e E2E | Seção 16 |

## 6. Stack

| Camada | Tecnologia |
| --- | --- |
| Sites (`pesquisa` e `gestao`) | React 18 + Vite + TypeScript + Tailwind CSS + React Router |
| API | Node.js 20 LTS + Express + TypeScript |
| Banco | **Supabase** (PostgreSQL), acessado **só pela API**, com SQL puro pela biblioteca `pg` |
| Schemas | SQL em `database/migrations/` + Zod em `packages/schemas/` |
| Tempo real | Socket.IO |
| Login | Tabela própria de usuários + JWT (`Authorization: Bearer <token>`) + bcrypt |
| Excel / QR | exceljs / qrcode |
| Documentação da API | swagger-jsdoc + swagger-ui-express em `/api/docs` |
| Testes | Vitest + Supertest (API), Vitest + Testing Library (sites), Playwright (E2E) |
| Deploy | **(a definir)** |

**Por que relacional (SQL):** o cruzamento resposta → escala (setor + data + turno → equipe) é um JOIN; precisamos de integridade entre setor, pesquisa, escala e comentários; o dashboard depende de agregações.

**Por que o banco é fácil de trocar:**
1. Os dois sites nunca falam com o banco, só com a API.
2. Dentro da API, os módulos só usam as interfaces de `src/database/repositories/`. Só a pasta `src/database/supabase/` sabe que o banco é o Supabase.
3. As tabelas são criadas com SQL padrão (sem recursos exclusivos do Supabase) e o login não usa o Supabase Auth.

**Convenções:**
- Código (variáveis, funções, tabelas, colunas, rotas da API) em **inglês**. Tabelas e colunas em `snake_case`. Textos da interface em **português**.
- Mensagens de commit em português, com prefixo (seção 15).
- Ambiente: Windows + PowerShell.

## 7. Arquitetura e pastas

```
pesquisa (site do paciente) ─┐
                             ├──> api ──> Supabase (PostgreSQL)
gestao (site dos gerentes) ──┘
```

**A** = Pessoa A (Estefanie) · **B** = Pessoa B (Rafaela) · **AB** = compartilhado (avisar o colega antes de mexer). A divisão completa está em [docs/plano/](docs/plano/).

```
/
├── README.md, CLAUDE.md, .gitignore       AB
├── package.json                           AB  (workspaces do npm)
├── docs/
│   ├── registro-processo.md               AB
│   └── plano/pessoa-a.md, pessoa-b.md     AB
├── database/
│   ├── migrations/                        B   (SQL que cria as tabelas)
│   └── seeds/                             A   (dados de exemplo)
├── packages/
│   └── schemas/src/                       B   (Zod, um arquivo por tabela; pacote `@avaliacoes/schemas`)
└── apps/
    ├── api/
    │   ├── package.json                   AB
    │   └── src/
    │       ├── app.ts, server.ts          AB
    │       ├── config/                    B
    │       ├── database/
    │       │   ├── index.ts               AB  (liga as interfaces às implementações; cada uma registra os seus repositórios)
    │       │   ├── repositories/          B   (interfaces) · A: `responses.repository.ts` e `dashboard.repository.ts`
    │       │   └── supabase/              B   (conexão e implementação com pg) · A: `responses.repository.ts` e `dashboard.repository.ts`
    │       ├── shared/                    B   (erros, middlewares de login e perfil) · A só `shift.ts` e `realtime.ts`
    │       └── modules/
    │           ├── auth/                  B
    │           ├── users/                 B
    │           ├── sectors/               B
    │           ├── surveys/               B
    │           ├── schedules/             B   (equipes e escala)
    │           ├── comments/              B   (lista e tratamento)
    │           ├── responses/             A   (rotas públicas da pesquisa + rotina de abandono)
    │           └── dashboard/             A   (indicadores, TV Wall, Excel)
    ├── pesquisa/                          A   (todo o site do paciente)
    └── gestao/
        ├── package.json                   AB
        └── src/
            ├── App.tsx (rotas)            AB
            ├── api/client.ts              AB
            ├── api/dashboard.ts           A
            ├── api/(demais).ts            B
            ├── auth/                      B   (login guardado, quem vê cada aba, proteção das rotas)
            ├── components/layout/         B   (menu e abas conforme o perfil)
            ├── components/charts/         A
            ├── pages/dashboard/           A
            ├── pages/tv-wall/             A
            └── pages/(login, setores, usuarios, pesquisas, escala, comentarios)/   B
```

Cada módulo da API segue o mesmo formato:

```
modules/<nome>/
├── <nome>.routes.ts       rotas Express
├── <nome>.controller.ts   lê a requisição, chama o service, devolve a resposta
├── <nome>.service.ts      regras de negócio (usa só as interfaces de repositories/)
└── <nome>.test.ts         testes
```

## 8. Banco de dados (contrato)

Banco **único**, compartilhado pelas duas aplicações através da API. **B** cria as tabelas em `database/migrations/` e o schema Zod de cada uma em `packages/schemas/`. Os nomes abaixo são o contrato: usem exatamente estes.

Tipos fixos (no SQL, `CHECK` com a lista de valores):

| Nome | Valores |
| --- | --- |
| `role` | `SUPER_ADMIN`, `SECTOR_ADMIN`, `VIEWER` |
| `journey_step` | `GERAL`, `RECEPCAO`, `TRIAGEM`, `ENFERMAGEM`, `MEDICO` |
| `shift` | `MANHA`, `TARDE`, `NOITE` |
| `response_status` | `PARTIAL`, `COMPLETE`, `ABANDONED` |
| `comment_type` | `ELOGIO`, `RECLAMACAO`, `SUGESTAO` |
| `comment_status` | `NEW`, `TREATED` |

Tabelas:

| Tabela | Colunas |
| --- | --- |
| `sectors` | `id` serial PK · `name` text · `slug` text único · `code` char(6) único · `active` boolean (padrão true) · `created_at` timestamptz |
| `users` | `id` serial PK · `name` text · `email` text único · `password_hash` text · `role` · `sector_id` → sectors (nulo só para `SUPER_ADMIN`) · `active` boolean · `created_at` |
| `surveys` | `id` serial PK · `sector_id` → sectors · `title` text · `active` boolean (só 1 ativa por setor) · `created_at` |
| `questions` | `id` serial PK · `survey_id` → surveys · `position` int · `text` text · `step` journey_step · `required` boolean (só 1 true por pesquisa) · `active` boolean |
| `teams` | `id` serial PK · `sector_id` → sectors · `name` text |
| `schedules` | `id` serial PK · `sector_id` → sectors · `shift_date` date · `shift` · `team_id` → teams · único (`sector_id`, `shift_date`, `shift`) |
| `responses` | `id` uuid PK · `sector_id` → sectors · `survey_id` → surveys · `shift_date` date · `shift` · `team_id` → teams (nulo se não houver escala) · `status` (padrão `PARTIAL`) · `overall_score` int 1–5 (cópia da obrigatória) · `created_at` · `updated_at` · `completed_at` |
| `answers` | `id` serial PK · `response_id` → responses · `question_id` → questions · `value` int 1–5 · `created_at` · único (`response_id`, `question_id`) |
| `comments` | `id` serial PK · `response_id` → responses · `type` comment_type (opcional) · `text` text · `status` (padrão `NEW`) · `treatment_note` text · `treated_by` → users · `treated_at` · `created_at` |

Índices: `responses(sector_id, created_at)`, `comments(status)`.

Tabela de controle (não faz parte do sistema, só das migrations): `schema_migrations` (`name` text PK · `applied_at` timestamptz) guarda quais arquivos de `database/migrations/` já rodaram. É criada sozinha pelo comando `npm run db:migrate`.

**Nenhuma tabela guarda dado pessoal do paciente (RN08).**

**Seeds (A):** setores de exemplo, uma pesquisa por setor, equipes, escala do mês atual, respostas e comentários variados, e um usuário de cada perfil. Senhas vêm do `.env` (`SEED_PASSWORD`), nunca escritas no código.

## 9. API (contrato)

Base: `/api`. JSON. Erros sempre em `{ "error": { "code": "REQUIRED_MISSING", "message": "..." } }`. Datas em ISO 8601.

Códigos de erro usados em todas as rotas:

| Status | `code` | Quando |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | O corpo ou os filtros vieram em formato errado |
| 401 | `UNAUTHORIZED` | Rota fechada sem token, com token inválido ou vencido |
| 401 | `INVALID_CREDENTIALS` | Login com e-mail ou senha incorretos (ou usuário desativado) |
| 403 | `FORBIDDEN` | O perfil não pode fazer aquilo, ou o setor não é o da pessoa (RN16) |
| 404 | `NOT_FOUND` | Rota ou registro que não existe |
| 500 | `INTERNAL_ERROR` | Erro inesperado na API |

Rotas fechadas recebem o token no cabeçalho `Authorization: Bearer <token>`. O token vale **8 horas** (decisão da dupla).

### Pública, sem login (módulo `responses`) — A

| Método | Rota | Corpo | Resposta |
| --- | --- | --- | --- |
| GET | `/public/sectors/:slug` | — | `{ sector: {id, name, slug}, survey: {id, questions: [{id, position, text, step, required}]} }` · 404 se setor inativo |
| GET | `/public/sectors/by-code/:code` | — | igual ao anterior |
| POST | `/public/responses` | `{ sectorId, surveyId, questionId, value }` | `201 { id }` · criada no 1º toque (RN09), calcula turno e equipe |
| PUT | `/public/responses/:id/answers/:questionId` | `{ value }` | `200 { ok: true }` · 409 se a resposta não estiver `PARTIAL` |
| POST | `/public/responses/:id/comment` | `{ type?, text }` | `201 { ok: true }` |
| POST | `/public/responses/:id/complete` | — | `200 { ok: true }` · 400 `REQUIRED_MISSING` se a obrigatória não foi respondida |

### Login (módulo `auth`) — B

| Método | Rota | Corpo | Resposta |
| --- | --- | --- | --- |
| POST | `/auth/login` | `{ email, password }` | `{ token, user: {id, name, role, sectorId} }` |
| GET | `/auth/me` | — | `{ user }` (mesmo formato do login) |

Na API, as rotas fechadas usam os middlewares de `src/shared/auth.ts`: `requireAuth` (precisa estar logado), `requireRole('SUPER_ADMIN', ...)` (só esses perfis) e `assertSectorAccess(user, sectorId)` (admin de setor e visualizador só no próprio setor).

### Cadastros (login obrigatório) — B

| Método | Rota | Quem pode |
| --- | --- | --- |
| GET/POST | `/sectors` · PUT/DELETE `/sectors/:id` | Super admin (admin de setor e visualizador só leem o próprio) |
| GET | `/sectors/:id/qrcode?type=slug\|code` | Super admin e admin do setor (PNG) |
| GET/POST | `/users` · PUT/DELETE `/users/:id` | Super admin: todos. Admin de setor: só visualizadores do seu setor |
| GET/POST | `/surveys` · PUT `/surveys/:id` | Super admin e admin do setor |
| GET/POST | `/surveys/:id/questions` · PUT/DELETE `/questions/:id` | Super admin e admin do setor |
| PUT | `/surveys/:id/questions/order` | `{ ids: [...] }` reordena |
| GET/POST | `/teams` · PUT/DELETE `/teams/:id` | Super admin e admin do setor |
| GET | `/schedules?sectorId&month=2026-10` | Todos os perfis (no próprio setor) |
| PUT | `/schedules` | `{ items: [{sectorId, shiftDate, shift, teamId}] }` · Super admin e admin do setor |

### Comentários (módulo `comments`) — B

| Método | Rota | Observação |
| --- | --- | --- |
| GET | `/comments?sectorId&status&type&from&to` | Todos os perfis (no próprio setor) |
| PATCH | `/comments/:id` | `{ status, treatmentNote }` · Super admin e admin do setor |

### Dashboard, TV Wall e Excel (módulo `dashboard`) — A

Filtros na query: `from`, `to` (YYYY-MM-DD), `sectorId`, `shift`, `teamId`. Admin de setor e visualizador recebem só o próprio setor.

| Método | Rota | Resposta |
| --- | --- | --- |
| GET | `/dashboard/summary` | `{ overallAverage, totalResponses, complete, partial, abandoned, distribution: {1,2,3,4,5} }` |
| GET | `/dashboard/questions` | `[{ questionId, text, step, average, count }]` |
| GET | `/dashboard/steps` | `[{ step, average, count }]` |
| GET | `/dashboard/breakdown?by=sector\|shift\|team` | `[{ key, label, average, count, insufficient }]` (RN15) |
| GET | `/dashboard/timeline` | `[{ date, average, count }]` |
| GET | `/dashboard/tv` | Só super admin: indicadores do hospital + **todos** os comentários (RN18) |
| GET | `/dashboard/export.xlsx` | Arquivo Excel das respostas filtradas |

### Tempo real (Socket.IO) — A

O evento só avisa; a tela busca os dados de novo pela API.

| Evento | Payload | Quem ouve |
| --- | --- | --- |
| `response:changed` | `{ sectorId }` | Dashboard, TV Wall |
| `comment:created` | `{ sectorId }` | Comentários, TV Wall |

## 10. Telas e rotas

### Site `pesquisa` — A

| Rota | Tela |
| --- | --- |
| `/:slug` | Pesquisa do setor (ex.: `/pronto-atendimento`) |
| `/c/:code` | Pesquisa pelo código curto |

Telas internas: perguntas opcionais (uma por tela) → pergunta obrigatória → comentário (sempre aparece, RN11) → agradecimento.

### Site `gestao`

| Rota | Tela | Perfis | Dono |
| --- | --- | --- | --- |
| `/login` | Login | todos | B |
| `/` | Dashboard | todos | A |
| `/tv` | TV Wall | só super admin | A |
| `/comentarios` | Comentários | todos (tratar: admins) | B |
| `/setores` | Setores + QR Code | super admin | B |
| `/usuarios` | Usuários | super admin e admin de setor | B |
| `/pesquisas`, `/pesquisas/:id` | Pesquisas e perguntas | super admin e admin de setor | B |
| `/escala` | Equipes e escala | super admin e admin de setor (visualizador só vê) | B |

Como funciona (tarefa B10):
- O login fica guardado **só até fechar a aba** (decisão da dupla, para computadores compartilhados do hospital). Dentro da aba, vale 8 horas.
- Menu numa **barra lateral à esquerda** (decisão da dupla); no celular vira um botão "Menu".
- Quem vê cada aba está em `apps/gestao/src/auth/menu.ts`: o menu e a proteção das rotas usam a mesma lista. Quem abre pelo endereço uma tela que o perfil não pode ver recebe "Sem permissão".
- As abas ainda não feitas mostram "Tela em construção" (`components/layout/UnderConstruction.tsx`). Cada tarefa troca, no `App.tsx`, o `<UnderConstruction>` da sua aba pela tela de verdade.
- Nas telas, `useAuth()` (de `src/auth/AuthContext.tsx`) diz quem está logado (`user.role`, `user.sectorId`). As chamadas pelo `api()` de `src/api/client.ts` já mandam o token.

## 11. Guia visual inicial

Valores iniciais para os dois começarem iguais. A Pessoa A finaliza em `docs/guia-de-estilos.md` e atualiza aqui.

- **Fonte:** Atkinson Hyperlegible (feita para baixa visão), fallback `system-ui`. Texto mínimo 18 px na pesquisa, 16 px na gestão.
- **Cores:** primária `#0B5FA5` · fundo `#F7F9FC` · texto `#1A2433` · sucesso `#2E7D32` · alerta `#B26A00` · erro `#C62828`. Contraste mínimo AA (4,5:1).
- **Carinhas (1 a 5):** `#C62828`, `#E65100`, `#F9A825`, `#7CB342`, `#2E7D32`, sempre com o rótulo em texto (Péssimo, Ruim, Regular, Bom, Ótimo), nunca só a cor.
- **Toque:** área mínima de 56×56 px na pesquisa.
- **Pesquisa:** logo pequeno no topo, pergunta grande, carinhas grandes, "pular" pequeno embaixo.

## 12. Como rodar localmente

Pré-requisitos: Node.js 20 LTS, Git e VS Code.

**Banco:** as duas usam **o mesmo projeto Supabase**, também durante o desenvolvimento. Por isso:
- o `DATABASE_URL` é o mesmo nas duas máquinas (passem um para a outra por mensagem privada, nunca pelo git);
- só a Rafaela roda as migrations (`database/migrations/`), e avisa a Estefanie antes;
- antes de rodar seeds ou apagar dados, avisem a colega, porque o que uma faz no banco a outra vê na hora.

**Primeira vez** (na pasta raiz do projeto; instala as bibliotecas de todos os apps de uma vez):

```bash
npm install
```

**API** (`apps/api`):

1. Copie `apps/api/.env.example` para `apps/api/.env` e preencha (o `.env` nunca vai para o git):
```bash
copy apps\api\.env.example apps\api\.env
```
2. Ligar a API (reinicia sozinha quando um arquivo muda):
```bash
npm run dev:api
```
3. Conferir no navegador: `http://localhost:3333/api/health` responde `{"status":"ok"}` e `http://localhost:3333/api/docs` abre o Swagger.
4. Rodar os testes (da API e do pacote de schemas):
```bash
npm run test:api
```
```bash
npm run test:schemas
```

**Banco** (só a Rafaela, e avisando a Estefanie antes, porque o banco é o mesmo para as duas):

1. Preencha o `DATABASE_URL` no `apps/api/.env` (Supabase → **Connect** → **Session pooler**).
2. Rodar as migrations novas de `database/migrations/` (as que já rodaram são puladas):
```bash
npm run db:migrate
```

**Site de gestão** (`apps/gestao`, porta `5174`; a API precisa estar ligada):

1. Copie o modelo do `.env`:
```bash
copy apps\gestao\.env.example apps\gestao\.env
```
2. Ligar o site:
```bash
npm run dev:gestao
```
3. Rodar os testes:
```bash
npm run test:gestao
```

Portas combinadas: `pesquisa` em `5173` e `gestao` em `5174` (são as que a API libera em `CORS_ORIGINS`). Os comandos do site `pesquisa` são da Pessoa A.

Variáveis de ambiente (os arquivos `.env` **nunca** vão para o git; só os `.env.example`):

| Arquivo | Variável | Para que serve |
| --- | --- | --- |
| `apps/api/.env` | `DATABASE_URL` | Endereço de conexão do Postgres do Supabase |
| | `JWT_SECRET` | Texto longo aleatório (mínimo 32 caracteres) para assinar o login. **Obrigatório:** sem ele a API e o `db:migrate` não rodam |
| | `PORT` | Porta da API (ex.: `3333`) |
| | `CORS_ORIGINS` | Endereços dos dois sites |
| | `SEED_PASSWORD` | Senha dos usuários de exemplo |
| `apps/pesquisa/.env` | `VITE_API_URL` | Endereço da API |
| `apps/gestao/.env` | `VITE_API_URL`, `VITE_SOCKET_URL` | Endereço da API e do tempo real |

## 13. Divisão de tarefas e estado do projeto

| Pessoa | Nome | Responsável por | Plano |
| --- | --- | --- | --- |
| A | Estefanie | Site da pesquisa inteiro + dashboard, TV Wall, Excel e tempo real | [docs/plano/pessoa-a.md](docs/plano/pessoa-a.md) |
| B | Rafaela | Banco (SQL, Zod, acesso ao Supabase) + login e perfis + cadastros (setores, QR, usuários, pesquisas, escala) + comentários | [docs/plano/pessoa-b.md](docs/plano/pessoa-b.md) |

O **estado do projeto** fica nos dois planos: cada tarefa tem um `[ ]` que vira `[x]` no mesmo commit que a conclui.

## 14. Como mudar um contrato

Contratos = seções 3, 8, 9 e 10. Os dois dependem deles.

1. Converse com o colega antes.
2. Atualize **primeiro este README** num commit próprio: `docs(contrato): <o que mudou>`.
3. Só depois mude o código.
4. Avise o colega para dar `git pull`.

## 15. Git: fluxo de trabalho

- `main`: só recebe a `develop` quando algo estiver pronto para publicar.
- `develop`: onde o trabalho dos dois se junta.
- Uma branch por tarefa, **saindo da `develop`**, com o nome indicado no plano (ex.: `feat/pesquisa-carinhas`). Ao terminar, a própria pessoa junta a branch na `develop` com `git merge`. **A dupla não usa Pull Request.**

```bash
git checkout develop
git pull
git checkout -b feat/pesquisa-carinhas
# ... trabalhar ...
git add <arquivos da tarefa>
git commit -m "feat(pesquisa): perguntas com carinhas"
git push -u origin feat/pesquisa-carinhas
```

Depois, juntar a tarefa na `develop` e enviar:

```bash
git checkout develop
git pull
git merge --no-edit feat/pesquisa-carinhas
git push
```

O `--no-edit` aceita a mensagem automática do merge, sem abrir o editor Vim.

Em seguida, avisar a colega para dar `git pull` na `develop` (e `npm install`, se algum `package.json` mudou).

- Nunca trabalhar direto na `main` nem na `develop`: elas só recebem merges.
- Cada um commita do próprio computador, com a própria conta.
- **Quem commita é sempre a pessoa, nunca o Claude.** O Claude não executa `git commit`, `git push` nem merge, e não coloca marca dele (`Co-Authored-By`, "Generated with Claude") em commits ou arquivos. Ao terminar cada tarefa, ele entrega o passo a passo dos comandos, explicando cada um e dizendo qual tarefa do plano e quais regras (RN) e decisões (D) aquele commit entrega.
- Prefixos: `feat` (funcionalidade), `fix` (correção), `docs` (documentos), `test` (testes), `chore` (configuração), `refactor` (reorganização sem mudar comportamento). Escopo entre parênteses: `feat(comments): ...`.
- Arquivos `AB` (seção 7): avise antes de mexer.

## 16. Testes

| Nível | Ferramenta | Exemplos |
| --- | --- | --- |
| Unitário | Vitest | turno (RN13), médias (RN20, RN21), mínimo de 5 respostas (RN15), permissões por perfil (RN16) |
| Integração | Vitest + Supertest + banco de teste | criar resposta, salvar toque, completar sem a obrigatória → 400, login, visualizador não edita, marcar comentário como tratado |
| E2E | Playwright | paciente responde tudo; paciente abandona no meio; super admin vê o TV Wall e o admin de setor não |

Rodar: `npm test` dentro de cada app. Os resultados vão para `docs/testes.md`.

## 17. Publicação (deploy)

**(a definir:** onde publicar a API e os dois sites. A dupla quer opções gratuitas; pedir sugestões antes da Etapa 5.) O banco fica no Supabase.

## 18. Entregáveis e checklist

**PDF do Projeto Aplicado:** nomes e cursos, personas, link do Figma (aberto), imagens do mock, link do sistema publicado, manual de uso, registro do processo com as justificativas.

**Solução Web Corporativa:** requisitos + matriz, relatório do banco + modelos + scripts SQL, repositório, Swagger, relatório de testes, sistema funcionando, pitch.

Antes de entregar, no sistema **publicado**:
- [ ] Uma resposta nova aparece no dashboard e no TV Wall
- [ ] Fechar a pesquisa no meio mantém o que foi respondido
- [ ] Nenhuma tela da pesquisa mostra quantas perguntas faltam
- [ ] Nenhum dado pessoal é pedido ao paciente
- [ ] Admin de setor e visualizador só veem o próprio setor
- [ ] Só o super admin vê o TV Wall, com todos os comentários
- [ ] Comentário pode ser marcado como tratado
- [ ] Excel baixa
- [ ] Links abertos para o professor

> Atenção: o enunciado indica entrega em 23/09/2026 e apresentações a partir de 30/09/2026. Confirmar as datas reais com os professores.
