# Sistema de Gestão da Experiência do Paciente

Pesquisa de satisfação digital para hospital: o paciente responde pelo celular (QR Code por setor), a gestão acompanha num dashboard, a Ouvidoria trata as manifestações e uma TV mostra indicadores públicos.

> **Este README é a fonte única de verdade do projeto.** Ele contém o contexto, as regras de negócio, as decisões e os **contratos** (banco de dados, API, rotas) que permitem que as duas pessoas da dupla trabalhem ao mesmo tempo sem se atrapalhar. Se algo mudar, mude aqui primeiro (ver [seção 14](#14-como-mudar-um-contrato)).

## Sumário

1. [Contexto acadêmico](#1-contexto-acadêmico)
2. [Cliente e problema](#2-cliente-e-problema)
3. [Regras de negócio](#3-regras-de-negócio)
4. [Decisões da dupla](#4-decisões-da-dupla)
5. [Requisitos](#5-requisitos)
6. [Stack](#6-stack)
7. [Estrutura de pastas e donos](#7-estrutura-de-pastas-e-donos)
8. [Modelo de dados (contrato)](#8-modelo-de-dados-contrato)
9. [API (contrato)](#9-api-contrato)
10. [Rotas do front-end](#10-rotas-do-front-end)
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
| **Projeto Aplicado** (14 pts) | Personas (2,5) · Figma com fluxo do paciente e caminho da nota baixa (2,5) · Mock alta fidelidade com decisões indicadas (3,0) · Front publicado e fiel ao mock (3,5) · Manual de uso para leigo (1,5) · Registro do processo (1,0). Entrega: um PDF no Classroom. Apresentação: 8 min, sistema funcionando pelo link |
| **Desenvolvimento de Solução Web Corporativa** | Requisitos + matriz de rastreabilidade · UX/UI e guia de estilos · Relatório SQL vs NoSQL, modelos e scripts DDL/DML · Front + back modulares · API documentada (Swagger/OpenAPI) · Testes em estágios (unitário, integração, E2E) · Repositório git · Pitch |

**Fora do escopo por enquanto:** plano de negócios.

## 2. Cliente e problema

- **Cliente:** hospital regional [FHDOD](https://fhdod.com.br/).
- **Hoje:** pesquisa em papel. ~3 respostas a cada 500 atendimentos, formulários incompletos e sem data, reclamações no verso, sem saber setor/turno/equipe. Só os insatisfeitos respondem; elogios se perdem. Horas digitando em planilhas.
- **Usuário final é leigo:** telas simples, só toques, botões grandes, linguagem simples (inclusive no manual).

## 3. Regras de negócio

Numeradas para serem citadas em código, testes e commits (ex.: `// RN07`).

### Pesquisa do paciente

- **RN01** Cada setor tem URL própria `site/<slug>` (ex.: `/pronto-atendimento`) e um código curto `site/c/<CODIGO>` (6 caracteres). Cada um gera um QR Code.
- **RN02** Uma pesquisa ativa por setor. Perguntas aparecem **uma por tela**, na ordem cadastrada.
- **RN03** **Nunca** mostrar número de perguntas, "3 de 10" ou barra de progresso.
- **RN04** A primeira pergunta é a **NPS (0 a 10)**, a **única obrigatória**. Quem cadastra é o ADM.
- **RN05** As demais perguntas são opcionais e respondidas com **carinhas (1 a 5)**. Organizadas por etapa da jornada: `RECEPCAO`, `TRIAGEM`, `ENFERMAGEM`, `MEDICO` (e `GERAL`). Cada setor só tem as etapas que fazem sentido (ex.: Raio-X sem Triagem).
- **RN06** Botão **"pular"** existe nas perguntas opcionais, mas é **discreto** (link pequeno, cor neutra, abaixo das opções).
- **RN07** **Salvar a cada toque.** A resposta é criada no banco quando o paciente toca a nota NPS (status `PARTIAL`), e cada pergunta seguinte é salva na hora. Se o paciente fechar o navegador, nada do que já respondeu se perde.
- **RN08** Resposta `PARTIAL` sem atividade por 30 min vira `ABANDONED` (job no back). Ao chegar no agradecimento vira `COMPLETE`. Parciais e abandonadas **contam** no dashboard para as perguntas respondidas.
- **RN09** **Janela de contato (modal).** Toda pergunta de **0 a 10** tem uma regra configurada pelo ADM:
  - `NONE`: não abre;
  - `ALL`: abre para todos, logo após responder aquela pergunta;
  - `BELOW_THRESHOLD`: abre só se a nota for **≤ limite** (padrão **6**).
  O modal contém: tipo (elogio / reclamação / sugestão, opcional), campo de texto, telefone (opcional), caixa "Aceito enviar meus dados" + frase da LGPD + link do termo, botões **Enviar** e **Agora não**. Depois do modal, a pesquisa continua.
- **RN10** Na última tela antes do agradecimento há um convite discreto: "Quer deixar um elogio, reclamação ou sugestão?" que abre o mesmo modal. Garante espaço para elogios de quem deu nota alta.
- **RN11** **LGPD:** o telefone só é aceito com a caixa de aceite marcada (front bloqueia o botão; back devolve `400 CONSENT_REQUIRED`). O texto e o link da LGPD são configurados pelo ADM. Usar frase provisória; o documento oficial vem do hospital.
- **RN12** "Agora não" fecha o modal sem salvar nada de contato; a resposta continua salva.
- **RN13** Rastreabilidade gravada em toda resposta: setor, origem (`QR`, `LINK`, `TABLET`), data, hora, turno e (se houver) telefone.

### Turno, escala e equipe

- **RN14** Turnos fixos (fuso `America/Sao_Paulo`): `MANHA` 07:00–12:59, `TARDE` 13:00–18:59, `NOITE` 19:00–06:59. Uma resposta de madrugada (00:00–06:59) pertence ao plantão **noturno do dia anterior**.
- **RN15** Escala mensal: para cada setor + data do plantão + turno existe uma equipe. A equipe de uma resposta é encontrada cruzando setor + data do plantão + turno.
- **RN16** Avaliação vinculada à **equipe**, nunca a uma pessoa. Indicadores por equipe só aparecem com **5 ou mais respostas** (abaixo disso: "dados insuficientes").

### Ouvidoria

- **RN17** Toda manifestação enviada pelo modal gera um **chamado** com protocolo sequencial `OUV-AAAA-NNNNNN` (ex.: `OUV-2026-000042`).
- **RN18** Chamado tem status `OPEN` → `IN_CONTACT` → `CLOSED`. A Ouvidoria marca "entrei em contato" ou o motivo de não ter conseguido (`NO_ANSWER`, `WRONG_NUMBER`, `PATIENT_DECLINED`, `OTHER`), escreve o relato e fecha.
- **RN19** Chamado mostra: protocolo, data/hora, setor, turno, equipe de plantão, nota NPS, texto, tipo e telefone.
- **RN20** Telefone: visível completo só para `OUVIDORIA` e `SUPER_ADMIN`; mascarado (`(31) 9****-**12`) para os demais. Ver um telefone completo grava um registro em `AccessLog`. Telefone é apagado 90 dias após o chamado ser fechado.
- **RN21** Elogios podem ser **aprovados para a TV** pela Ouvidoria (só o texto, sem dados pessoais).

### Indicadores

- **RN22** NPS = % promotores (9–10) − % detratores (0–6), arredondado para inteiro, de −100 a 100.
- **RN23** Média das carinhas por pergunta/etapa: média de 1 a 5 com 1 casa decimal. Perguntas puladas não entram.
- **RN24** Dashboard filtra por período, setor, turno e equipe, e navega hospital → setor → turno → equipe. Atualiza em tempo real.
- **RN25** **TV Wall** (diferente do dashboard): sem login, mostra só NPS geral, total de respostas do dia e elogios aprovados. **Nunca** reclamações, telefones, nomes ou ranking de equipes.

### Acesso

- **RN26** Perfis: `SUPER_ADMIN` (faz tudo, inclusive cadastrar gestores de setor), `SECTOR_ADMIN` (gestor: dashboard/escala/perguntas do seu setor), `GESTAO` (dashboard de todos + Excel), `OUVIDORIA` (chamados), `VIEWER` (só dashboard, sem dados pessoais).

## 4. Decisões da dupla

O Projeto Aplicado exige no mínimo 4 decisões justificadas, indicadas no mock e implementadas.

| # | Decisão | Por quê |
| --- | --- | --- |
| D1 | NPS 0–10 obrigatória, **primeira** tela; demais com carinhas | Pedido do cliente; no início garante o dado principal mesmo se o paciente desistir; carinhas são fáceis para leigos |
| D2 | Ouvidoria a partir de nota **≤ 6**, configurável pelo ADM | Faixa de detratores do NPS |
| D3 | Estimular quem gostou: QR entregue na alta, pesquisa curta sem contador, convite ao elogio (RN10), elogios na TV | Combater o viés de só insatisfeitos responderem |
| D4 | Vínculo por equipe/turno, nunca pessoa; mínimo de 5 respostas | Não responsabilizar injustamente |
| D5 | Telefone só com aceite; só Ouvidoria/ADM veem; apagado em 90 dias; log de acesso | LGPD: minimização e finalidade |
| D6 | TV Wall só com dados públicos e positivos | Tela exposta ao público |
| D7 | Celular via QR como canal principal; tablet de apoio | Custo zero, privacidade |
| D8 | Salvar a cada resposta | Abandono não perde dados |

## 5. Requisitos

| ID | Requisito | Regras |
| --- | --- | --- |
| RF01 | ADM cadastra e edita tudo: setores, usuários/gestores, pesquisas, perguntas, NPS, regras do modal, LGPD | RN04, RN09, RN11, RN26 |
| RF02 | URL e QR Code por setor | RN01 |
| RF03 | Uma pergunta por tela, sem contador | RN02, RN03 |
| RF04 | NPS obrigatória, demais opcionais com carinhas | RN04, RN05 |
| RF05 | Pular discreto | RN06 |
| RF06 | Perguntas por etapa da jornada | RN05 |
| RF07 | Salvar a cada toque; tratar abandono | RN07, RN08 |
| RF08 | Modal de contato com LGPD, configurável | RN09–RN12 |
| RF09 | Rastreabilidade (origem, dia, hora, turno, telefone) | RN13, RN14 |
| RF10 | Cruzamento com a escala mensal | RN15, RN16 |
| RF11 | Ouvidoria com protocolo, contato, relato e fechamento | RN17–RN21 |
| RF12 | Perfis de acesso | RN26 |
| RF13 | Dashboard em tempo real com filtros e drill-down | RN22–RN24 |
| RF14 | TV Wall separado | RN25 |
| RF15 | Exportar Excel | — |
| RF16 | Celular e tablet, só toques, botões grandes | Seção 11 |
| RNF01 | Manual simples para leigo | — |
| RNF02 | LGPD | RN11, RN20 |
| RNF03 | API documentada em Swagger | Seção 9 |
| RNF04 | Testes unitários, integração e E2E | Seção 16 |

## 6. Stack

| Camada | Tecnologia |
| --- | --- |
| Front | React 18 + Vite + TypeScript + Tailwind CSS + React Router |
| Back | Node.js 20 LTS + Express + TypeScript |
| Banco | PostgreSQL + Prisma (ORM e migrations) |
| Tempo real | Socket.IO |
| Autenticação | JWT (header `Authorization: Bearer <token>`) + bcrypt |
| Validação | Zod (back) |
| Excel / QR | exceljs / qrcode |
| Documentação da API | swagger-jsdoc + swagger-ui-express em `/api/docs` |
| Testes | Vitest + Supertest (back), Vitest + Testing Library (front), Playwright (E2E) |
| Deploy | Vercel (front), Render (back), Neon (PostgreSQL) |

**Por que relacional (SQL):** o cruzamento resposta → escala (setor + data + turno → equipe) é um JOIN; precisamos de integridade entre setor, pesquisa, escala e chamado; o dashboard depende de agregações; o acesso é controlado por perfil.

**Convenções:**
- Código (variáveis, funções, tabelas, rotas da API) em **inglês**. Textos da interface em **português**.
- Mensagens de commit em português, com prefixo (ver seção 15).
- Ambiente de desenvolvimento: Windows + PowerShell.

## 7. Estrutura de pastas e donos

**A** = Pessoa A (paciente + TV Wall). **B** = Pessoa B (gestão + banco). **AB** = compartilhado (avisar o outro antes de mexer).

```
/
├── README.md                     AB  (este arquivo)
├── CLAUDE.md                     AB  (instruções para o Claude)
├── .gitignore                    AB
├── docs/
│   ├── registro-processo.md      AB  (cada um escreve no fim do dia)
│   ├── personas.md               A (paciente) / B (ouvidoria)
│   ├── decisoes.md               A (D1 D2 D3 D7 D8) / B (D4 D5 D6)
│   ├── guia-de-estilos.md        A
│   ├── requisitos.md             B   (matriz de rastreabilidade)
│   ├── banco-de-dados.md         B   (SQL vs NoSQL, modelos)
│   ├── testes.md                 B   (relatório) + A (casos da pesquisa)
│   └── manual/                   A (paciente, TV) / B (gestão)
├── backend/
│   ├── package.json              AB
│   ├── .env.example              AB
│   ├── prisma/
│   │   ├── schema.prisma         B   (A altera só via PR)
│   │   └── seed.ts               A
│   └── src/
│       ├── server.ts             AB  (sobe o http + socket)
│       ├── app.ts                AB  (registra as rotas dos módulos)
│       ├── shared/
│       │   ├── prisma.ts         B
│       │   ├── auth.ts           B   (middlewares requireAuth / requireRole)
│       │   ├── errors.ts         B
│       │   ├── shift.ts          A   (cálculo de turno, RN14)
│       │   └── realtime.ts       A   (Socket.IO)
│       ├── docs/swagger.ts       B
│       └── modules/
│           ├── public-survey/    A   (pesquisa e modal)
│           ├── tv/               A
│           ├── jobs/             A   (abandono)
│           ├── auth/             B
│           ├── admin/            B   (setores, usuários, pesquisas, config, QR)
│           ├── schedule/         B   (equipes e escala)
│           ├── dashboard/        B   (indicadores + Excel)
│           └── tickets/          B   (ouvidoria + LGPD)
└── frontend/
    ├── package.json              AB
    ├── .env.example              AB
    └── src/
        ├── main.tsx, App.tsx     AB  (rotas)
        ├── api/
        │   ├── client.ts         AB  (fetch base + token)
        │   ├── survey.ts, tv.ts  A
        │   └── admin.ts, dashboard.ts, tickets.ts, auth.ts   B
        ├── components/ui/        A   (Button, NpsScale, FaceRating, Modal...)
        ├── pages/survey/         A
        ├── pages/tv/             A
        └── pages/admin/          B
```

Cada módulo do back segue o mesmo formato:

```
modules/<nome>/
├── <nome>.routes.ts       rotas Express
├── <nome>.controller.ts   lê req, chama o service, devolve res
├── <nome>.service.ts      regras de negócio e acesso ao banco
├── <nome>.schemas.ts      validação Zod
└── <nome>.test.ts         testes
```

## 8. Modelo de dados (contrato)

Referência para os dois. **B** implementa no `schema.prisma`; nomes devem ser exatamente estes.

```prisma
enum Role            { SUPER_ADMIN SECTOR_ADMIN GESTAO OUVIDORIA VIEWER }
enum QuestionType    { NPS FACES }               // NPS = 0..10, FACES = 1..5
enum JourneyStep     { GERAL RECEPCAO TRIAGEM ENFERMAGEM MEDICO }
enum ContactRule     { NONE ALL BELOW_THRESHOLD }
enum Shift           { MANHA TARDE NOITE }
enum ResponseStatus  { PARTIAL COMPLETE ABANDONED }
enum Origin          { QR LINK TABLET }
enum FeedbackType    { ELOGIO RECLAMACAO SUGESTAO }
enum TicketStatus    { OPEN IN_CONTACT CLOSED }
enum NoContactReason { NO_ANSWER WRONG_NUMBER PATIENT_DECLINED OTHER }

model Sector {
  id        Int      @id @default(autoincrement())
  name      String
  slug      String   @unique          // "pronto-atendimento"
  code      String   @unique          // "PA7K2Q" (6 chars)
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
}

model User {
  id           Int     @id @default(autoincrement())
  name         String
  email        String  @unique
  passwordHash String
  role         Role
  sectorId     Int?                    // obrigatório para SECTOR_ADMIN
  active       Boolean @default(true)
}

model Survey {
  id       Int     @id @default(autoincrement())
  sectorId Int
  title    String
  active   Boolean @default(true)       // só 1 ativa por setor
}

model Question {
  id               Int          @id @default(autoincrement())
  surveyId         Int
  order            Int
  text             String
  type             QuestionType
  step             JourneyStep  @default(GERAL)
  required         Boolean      @default(false)  // true só na NPS
  contactRule      ContactRule  @default(NONE)    // só para type NPS (0..10)
  contactThreshold Int?         @default(6)
  active           Boolean      @default(true)
}

model Team {
  id       Int    @id @default(autoincrement())
  sectorId Int
  name     String                       // "Equipe A"
}

model Schedule {
  id       Int      @id @default(autoincrement())
  sectorId Int
  date     DateTime @db.Date            // data do plantão (RN14)
  shift    Shift
  teamId   Int
  @@unique([sectorId, date, shift])
}

model Response {
  id          String         @id @default(uuid())
  sectorId    Int
  surveyId    Int
  origin      Origin         @default(QR)
  shiftDate   DateTime       @db.Date  // data do plantão
  shift       Shift
  teamId      Int?                     // preenchido pelo cruzamento com Schedule
  status      ResponseStatus @default(PARTIAL)
  npsScore    Int?                     // cópia da nota NPS para agilizar o dashboard
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  completedAt DateTime?
  @@index([sectorId, createdAt])
}

model Answer {
  id         Int      @id @default(autoincrement())
  responseId String
  questionId Int
  value      Int                        // 0..10 (NPS) ou 1..5 (FACES)
  createdAt  DateTime @default(now())
  @@unique([responseId, questionId])    // permite "upsert" a cada toque
}

model Feedback {
  id            Int           @id @default(autoincrement())
  responseId    String
  questionId    Int?                    // pergunta que abriu o modal (null = convite final)
  type          FeedbackType?
  text          String?
  phone         String?
  consent       Boolean       @default(false)
  consentAt     DateTime?
  approvedForTv Boolean       @default(false)
  createdAt     DateTime      @default(now())
}

model Ticket {
  id              Int              @id @default(autoincrement())
  protocol        String           @unique  // OUV-2026-000042
  feedbackId      Int              @unique
  status          TicketStatus     @default(OPEN)
  contacted       Boolean          @default(false)
  noContactReason NoContactReason?
  report          String?
  handledById     Int?
  createdAt       DateTime         @default(now())
  closedAt        DateTime?
  @@index([status])
}

model Settings {
  id                  Int    @id @default(1)  // linha única
  lgpdText            String
  lgpdUrl             String
  abandonAfterMinutes Int    @default(30)
  phoneRetentionDays  Int    @default(90)
}

model AccessLog {
  id        Int      @id @default(autoincrement())
  userId    Int
  action    String                     // "VIEW_PHONE"
  ticketId  Int?
  createdAt DateTime @default(now())
}
```

(As relações `@relation` ficam a cargo de B no schema real; os campos acima são o contrato.)

**Dados de exemplo (seed, A):** 4 setores (Pronto Atendimento, Internação, Raio-X, Ambulatório), uma pesquisa por setor com NPS + perguntas por etapa, 2 equipes por setor, escala do mês atual, ~200 respostas variadas, alguns chamados, Settings com frase provisória da LGPD, e um usuário de cada perfil. As senhas do seed vêm do `.env` (`SEED_PASSWORD`), nunca escritas no código.

## 9. API (contrato)

Base: `/api`. JSON. Erros sempre em `{ "error": { "code": "CONSENT_REQUIRED", "message": "..." } }`. Datas em ISO 8601.

### Pública (sem login) — Pessoa A

| Método | Rota | Corpo / query | Resposta |
| --- | --- | --- | --- |
| GET | `/public/sectors/:slug` | — | `{ sector: {id,name,slug}, survey: {id, questions: [{id,order,text,type,step,required,contactRule,contactThreshold}]}, lgpd: {text,url} }` · 404 se setor inativo |
| GET | `/public/sectors/by-code/:code` | — | igual ao anterior |
| POST | `/public/responses` | `{ sectorId, surveyId, origin, npsQuestionId, npsScore }` | `201 { id }` · cria com status PARTIAL, calcula turno/equipe |
| PUT | `/public/responses/:id/answers/:questionId` | `{ value }` | `200 { ok: true }` · upsert; 409 se a resposta não estiver PARTIAL |
| POST | `/public/responses/:id/feedback` | `{ questionId?, type?, text?, phone?, consent }` | `201 { protocol }` · 400 `CONSENT_REQUIRED` se phone sem consent; cria Feedback + Ticket |
| POST | `/public/responses/:id/complete` | — | `200 { ok: true }` |
| GET | `/public/tv` | — | `{ nps, responsesToday, praises: [{text, sectorName, createdAt}] }` |

### Autenticação — Pessoa B

| Método | Rota | Corpo | Resposta |
| --- | --- | --- | --- |
| POST | `/auth/login` | `{ email, password }` | `{ token, user: {id,name,role,sectorId} }` |
| GET | `/auth/me` | — | `{ user }` |

### Admin (login; `SUPER_ADMIN`, e `SECTOR_ADMIN` só no seu setor) — Pessoa B

| Método | Rota | Observação |
| --- | --- | --- |
| GET/POST | `/admin/sectors` | listar / criar (gera `code`) |
| PUT/DELETE | `/admin/sectors/:id` | editar / desativar |
| GET | `/admin/sectors/:id/qrcode?type=slug\|code` | PNG do QR Code |
| GET/POST | `/admin/users` · PUT/DELETE `/admin/users/:id` | só SUPER_ADMIN |
| GET/POST | `/admin/surveys` · PUT `/admin/surveys/:id` | |
| GET/POST | `/admin/surveys/:id/questions` · PUT/DELETE `/admin/questions/:id` | |
| PUT | `/admin/surveys/:id/questions/order` | `{ ids: [..] }` reordena |
| GET/PUT | `/admin/settings` | texto/link LGPD, tempos |
| GET/POST | `/admin/teams` · PUT/DELETE `/admin/teams/:id` | |
| GET | `/admin/schedules?sectorId&month=2026-10` | |
| PUT | `/admin/schedules` | `{ items: [{sectorId,date,shift,teamId}] }` (upsert em lote) |

### Dashboard (login; todos os perfis exceto OUVIDORIA-only) — Pessoa B

Filtros comuns na query: `from`, `to` (YYYY-MM-DD), `sectorId`, `shift`, `teamId`.

| Método | Rota | Resposta |
| --- | --- | --- |
| GET | `/dashboard/summary` | `{ nps, totalResponses, complete, partial, abandoned, promoters, passives, detractors }` |
| GET | `/dashboard/steps` | `[{ step, average, count }]` (média das carinhas por etapa) |
| GET | `/dashboard/breakdown?by=sector\|shift\|team` | `[{ key, label, nps, count, insufficient }]` (RN16) |
| GET | `/dashboard/timeline` | `[{ date, nps, count }]` |
| GET | `/dashboard/export.xlsx` | arquivo Excel com as respostas filtradas (telefone mascarado conforme perfil) |

### Ouvidoria (login; `OUVIDORIA`, `SUPER_ADMIN`) — Pessoa B

| Método | Rota | Observação |
| --- | --- | --- |
| GET | `/tickets?status&sectorId&from&to` | lista com telefone mascarado |
| GET | `/tickets/:id` | detalhe com telefone completo; grava AccessLog |
| PATCH | `/tickets/:id` | `{ status?, contacted?, noContactReason?, report? }` |
| PATCH | `/tickets/:id/approve-tv` | `{ approved: boolean }` (só elogios) |

### Tempo real (Socket.IO) — Pessoa A

O back emite; o front ouve e **busca os dados de novo** pela API (o evento não carrega dados pessoais).

| Evento | Payload | Quem ouve |
| --- | --- | --- |
| `response:changed` | `{ sectorId }` | dashboard, TV |
| `ticket:created` | `{ sectorId }` | tela da Ouvidoria |

## 10. Rotas do front-end

| Rota | Tela | Dono |
| --- | --- | --- |
| `/:slug` | Pesquisa do setor (ex.: `/pronto-atendimento`) | A |
| `/c/:code` | Pesquisa pelo código curto | A |
| `/tv` | TV Wall | A |
| `/login` | Login | B |
| `/admin` | Dashboard | B |
| `/admin/ouvidoria` e `/admin/ouvidoria/:id` | Chamados | B |
| `/admin/setores` | Setores + QR Code | B |
| `/admin/usuarios` | Usuários | B |
| `/admin/pesquisas` e `/admin/pesquisas/:id` | Pesquisas e perguntas | B |
| `/admin/escala` | Equipes e escala | B |
| `/admin/configuracoes` | LGPD e tempos | B |

Rotas fixas (`/tv`, `/login`, `/admin`, `/c`) são reservadas: nenhum setor pode ter esses slugs.

## 11. Guia visual inicial

Valores iniciais para os dois começarem iguais. A Pessoa A finaliza no `docs/guia-de-estilos.md` e atualiza aqui.

- **Fonte:** Atkinson Hyperlegible (feita para baixa visão), fallback `system-ui`. Texto mínimo 18 px na pesquisa, 16 px na gestão.
- **Cores:** primária `#0B5FA5` · fundo `#F7F9FC` · texto `#1A2433` · sucesso `#2E7D32` · alerta `#B26A00` · erro `#C62828`. Contraste mínimo AA (4,5:1).
- **Carinhas (1 a 5):** `#C62828`, `#E65100`, `#F9A825`, `#7CB342`, `#2E7D32`, sempre com rótulo em texto (Péssimo, Ruim, Regular, Bom, Ótimo), nunca só cor.
- **Toque:** área mínima de 56×56 px na pesquisa; uma pergunta e no máximo 5–11 opções por tela.
- **Pesquisa:** sem cabeçalho poluído, logo pequeno no topo, pergunta grande, opções grandes, "pular" pequeno embaixo.

## 12. Como rodar localmente

Pré-requisitos: Node.js 20 LTS, Git, VS Code. Banco: cada pessoa cria **o seu próprio** banco gratuito no [Neon](https://neon.tech) para desenvolver (assim as migrations de um não quebram o banco do outro).

```bash
# back-end
cd backend
copy .env.example .env      # depois preencha o .env
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev                 # http://localhost:3333  · Swagger em /api/docs

# front-end (outro terminal)
cd frontend
copy .env.example .env
npm install
npm run dev                 # http://localhost:5173
```

Variáveis de ambiente:

| Arquivo | Variável | Exemplo |
| --- | --- | --- |
| `backend/.env` | `DATABASE_URL` | URL do Neon |
| | `JWT_SECRET` | texto longo aleatório |
| | `PORT` | `3333` |
| | `CORS_ORIGIN` | `http://localhost:5173` |
| | `SEED_PASSWORD` | senha dos usuários de exemplo |
| `frontend/.env` | `VITE_API_URL` | `http://localhost:3333/api` |
| | `VITE_SOCKET_URL` | `http://localhost:3333` |

`.env` **nunca** vai para o git (só o `.env.example`).

## 13. Divisão de tarefas e estado do projeto

**Pessoa A:** _(nome)_ — paciente + TV Wall. **Pessoa B:** _(nome)_ — gestão + banco.

Marque `[x]` ao terminar (no mesmo commit da tarefa). Assim o Claude de cada um sabe o que já existe.

### Etapa 0 — Preparar (juntos)
- [ ] Definir quem é A e quem é B (preencher os nomes acima)
- [ ] Instalar Node.js 20, Git, VS Code (os dois)
- [ ] A dupla tem acesso de escrita ao repositório
- [ ] Arquivo do Figma criado e compartilhado (A) — link: _(colar)_
- [ ] Estrutura de pastas + `package.json` do back e do front criados — `chore: estrutura inicial do projeto`

### Etapa 1 — Entender e desenhar
| Pessoa A | Pessoa B |
| --- | --- |
| - [ ] Persona do paciente — `docs: persona paciente` | - [ ] Persona da Ouvidoria — `docs: persona ouvidoria` |
| - [ ] Decisões D1 D2 D3 D7 D8 — `docs: decisoes da pesquisa` | - [ ] Decisões D4 D5 D6 — `docs: decisoes da gestao` |
| - [ ] Guia de estilos — `docs: guia de estilos` | - [ ] Requisitos + matriz — `docs: requisitos e rastreabilidade` |
| - [ ] Figma: fluxo da pesquisa com caminho da nota baixa | - [ ] Figma: fluxo da gestão |
| - [ ] Mock: pesquisa, modal, agradecimento, TV | - [ ] Mock: login, dashboard, ouvidoria, cadastros |

### Etapa 2 — Base
| Pessoa A | Pessoa B |
| --- | --- |
| - [ ] Projeto React + Tailwind + rotas — `chore: cria projeto frontend` | - [ ] Projeto Express + TS + estrutura de módulos — `chore: cria projeto backend` |
| - [ ] Componentes UI (Button, NpsScale, FaceRating, Modal) — `feat(ui): componentes base` | - [ ] `schema.prisma` + migration — `feat(db): cria tabelas` |
| - [ ] `shift.ts` + testes (RN14) — `feat(shared): calculo de turno` | - [ ] Relatório do banco — `docs: relatorio do banco` |
| - [ ] Seed — `feat(db): dados de exemplo` | - [ ] Swagger em `/api/docs` — `chore(api): configura swagger` |

### Etapa 3 — Funcionalidades principais
| Pessoa A | Pessoa B |
| --- | --- |
| - [ ] GET setor por slug/código — `feat(survey): abre pesquisa pelo setor` | - [ ] Login JWT — `feat(auth): login` |
| - [ ] Tela NPS + POST resposta — `feat(survey): pergunta NPS` | - [ ] Middleware de perfis — `feat(auth): perfis de acesso` |
| - [ ] Perguntas com carinhas + PUT answer + pular — `feat(survey): perguntas com carinhas` | - [ ] CRUD setores/usuários — `feat(admin): setores e usuarios` |
| - [ ] Modal de contato + LGPD + feedback — `feat(survey): janela de contato` | - [ ] CRUD pesquisas/perguntas/config — `feat(admin): pesquisas e configuracoes` |
| - [ ] Convite final + agradecimento + complete — `feat(survey): agradecimento` | - [ ] Equipes e escala — `feat(schedule): escala de plantao` |

### Etapa 4 — Integrar
| Pessoa A | Pessoa B |
| --- | --- |
| - [ ] Job de abandono (RN08) — `feat(jobs): respostas abandonadas` | - [ ] Endpoints do dashboard — `feat(dashboard): indicadores` |
| - [ ] Socket.IO — `feat(realtime): atualizacao ao vivo` | - [ ] Tela do dashboard com filtros — `feat(dashboard): painel com filtros` |
| - [ ] GET `/public/tv` + tela TV — `feat(tv): tv wall` | - [ ] Ouvidoria (lista, detalhe, contato, fechar) — `feat(tickets): ouvidoria` |
| - [ ] Responsivo celular/tablet — `fix: telas responsivas` | - [ ] Excel + QR Code — `feat(admin): excel e qr code` |
| | - [ ] Máscara, AccessLog, expurgo 90 dias — `feat(lgpd): protecao do telefone` |

### Etapa 5 — Testar e publicar
| Pessoa A | Pessoa B |
| --- | --- |
| - [ ] Testes da pesquisa (unit + integração) — `test: pesquisa` | - [ ] Testes da gestão (unit + integração) — `test: gestao` |
| - [ ] E2E do paciente com Playwright — `test(e2e): fluxo do paciente` | - [ ] Relatório de testes — `docs: relatorio de testes` |
| - [ ] Swagger dos endpoints públicos — `docs(api): endpoints publicos` | - [ ] Swagger da gestão — `docs(api): endpoints da gestao` |
| - [ ] Deploy do front (Vercel) — `chore: publica frontend` | - [ ] Deploy back (Render) + banco (Neon) — `chore: publica backend` |

### Etapa 6 — Documentos e apresentação
- [ ] Manual: paciente e TV, com prints do sistema publicado (A) — `docs: manual paciente e tv`
- [ ] Manual: dashboard e ouvidoria (B) — `docs: manual gestao`
- [ ] Registro do processo completo (AB)
- [ ] PDF de entrega montado (AB)
- [ ] Ensaio de 8 min: A mostra pesquisa e TV; B mostra dashboard, ouvidoria e decisões (AB)

**Links:** Figma: _(colar)_ · Front publicado: _(colar)_ · API publicada: _(colar)_

## 14. Como mudar um contrato

Contratos = seções 3, 8, 9 e 10. Os dois dependem deles.

1. Converse com o colega antes.
2. Atualize **primeiro este README** num commit próprio: `docs(contrato): <o que mudou>`.
3. Só depois mude o código.
4. Avise o colega para dar `git pull`.

## 15. Git: fluxo de trabalho

```bash
git checkout main
git pull
git checkout -b feat/pergunta-nps
# ... trabalhar ...
git add .
git commit -m "feat(survey): pergunta NPS"
git push -u origin feat/pergunta-nps
```

Depois: abrir **Pull Request** no GitHub → o colega revisa → **Merge** → os dois dão `git pull` na `main`.

- Nunca commitar direto na `main`. Uma branch por tarefa.
- Cada um commita do próprio computador, com a própria conta.
- **Quem commita é sempre a pessoa, nunca o Claude.** O Claude não executa `git commit`, `git push` nem merge, e não coloca nenhuma marca dele (`Co-Authored-By`, "Generated with Claude") em commits, Pull Requests ou arquivos. Ao terminar cada tarefa, ele entrega o passo a passo dos comandos acima, explicando cada um e dizendo qual tarefa da seção 13 e quais regras (RN) e decisões (D) do projeto aquele commit entrega.
- Prefixos: `feat` (funcionalidade), `fix` (correção), `docs` (documentos), `test` (testes), `chore` (configuração), `refactor` (reorganização sem mudar comportamento). Escopo entre parênteses = módulo: `feat(tickets): ...`.
- Arquivos `AB` (seção 7): avise antes de mexer.

## 16. Testes

| Nível | Ferramenta | Exemplos |
| --- | --- | --- |
| Unitário | Vitest | cálculo de turno (RN14), NPS (RN22), regra do modal (RN09), máscara do telefone (RN20) |
| Integração | Vitest + Supertest + banco de teste | POST resposta, PUT answer, feedback sem consent → 400, login, permissões, PATCH ticket |
| E2E | Playwright | paciente responde tudo; paciente abandona no meio; nota baixa abre modal |

Rodar: `npm test` dentro de `backend/` ou `frontend/`. Os resultados vão para `docs/testes.md`.

## 17. Publicação (deploy)

| Parte | Serviço | Observações |
| --- | --- | --- |
| Banco | Neon | projeto de produção separado dos de desenvolvimento |
| Back | Render (Web Service) | build `npm install && npx prisma migrate deploy && npm run build`; start `npm start`; variáveis do `.env` no painel |
| Front | Vercel | raiz `frontend/`; `VITE_API_URL` apontando para o Render; rewrite de todas as rotas para `index.html` |

## 18. Entregáveis e checklist

**PDF do Projeto Aplicado:** nomes e cursos, personas, link do Figma (aberto), imagens do mock, link do front, manual de uso, registro do processo com justificativas.

**Solução Web Corporativa:** requisitos + matriz, relatório do banco + modelos + scripts, repositório, Swagger, relatório de testes, sistema funcionando, pitch.

Antes de entregar, no sistema **publicado**:
- [ ] Resposta nova aparece no dashboard e na TV
- [ ] Fechar a pesquisa no meio mantém o que foi respondido
- [ ] Modal segue a regra do ADM e exige aceite para o telefone
- [ ] Nenhuma tela mostra quantas perguntas faltam
- [ ] Ouvidoria marca contato, relata e fecha um chamado
- [ ] Excel baixa
- [ ] Links abertos para o professor

> Atenção: o enunciado indica entrega em 23/09/2026 e apresentações a partir de 30/09/2026. Confirmar as datas reais com os professores.
