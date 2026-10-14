# Plano da Pessoa A

**Responsável por:** site da pesquisa (inteiro) + dashboard, TV Wall, Excel e tempo real no site de gestão.
**Nome:** Estefanie

Contexto, regras (RN), decisões (D) e contratos: [README](../../README.md). Plano da colega (Rafaela): [pessoa-b.md](pessoa-b.md).

## Como usar este plano

- Faça as tarefas **na ordem**. Cada uma tem a sua branch, que sai da `develop` e volta para a `develop` por Pull Request (README, seção 15).
- **Depende de** diz quais tarefas da Pessoa B precisam estar na `develop` antes de começar. Se ainda não estiverem, pule para a próxima tarefa que não dependa delas.
- Ao terminar uma tarefa, troque `[ ]` por `[x]` **no mesmo commit** e escreva 3 linhas em `docs/registro-processo.md`.
- Itens **(a definir)** precisam ser decididos pela dupla antes de implementar.

## Etapa 1 — Documentos e design

- [x] **A1 · Persona do paciente**
  - Branch: `docs/persona-paciente`
  - O que fazer: em `docs/personas.md`, seção "Paciente": nome fictício, idade, contexto, objetivos, dores, familiaridade com tecnologia, canal preferido e uma frase que represente a visão dela.
  - Commit: `docs: persona do paciente`
  - Pronto quando: tem todos os itens pedidos pelo professor.

- [x] **A2 · Decisões D1, D2, D3, D6 e D7**
  - Branch: `docs/decisoes-pesquisa`
  - O que fazer: em `docs/decisoes.md`, escrever cada decisão com o porquê, ligando-a à persona do paciente. As justificativas aprovadas pela dupla estão no README (seção 4); aqui elas são explicadas com mais detalhe.
  - Commit: `docs: decisoes da pesquisa`

- [x] **A3 · Guia de estilos**
  - Branch: `docs/guia-de-estilos`
  - O que fazer: `docs/guia-de-estilos.md` com cores, fontes, tamanhos, carinhas, botões e estados (normal, tocado, desabilitado). Partir da seção 11 do README e atualizá-la se algo mudar.
  - Commit: `docs: guia de estilos`

- [ ] **A4 · Figma: fluxo da pesquisa** (fora do git)
  - O que fazer: fluxo do QR Code até o agradecimento, com as perguntas opcionais, o "pular", a obrigatória na última tela, o comentário e o caso de quem fecha no meio.
  - Pronto quando: o link do Figma está colado no README (seção 13) e aberto para visualização.

- [ ] **A5 · Mock: pesquisa, dashboard e TV Wall** (fora do git)
  - O que fazer: telas em alta fidelidade seguindo o guia de estilos, com as decisões indicadas nas telas.

## Etapa 2 — Base

- [x] **A6 · Criar os sites `pesquisa` e `gestao`**
  - Branch: `chore/sites-base`
  - O que fazer: projetos React + Vite + TypeScript + Tailwind + React Router em `apps/pesquisa` e `apps/gestao`; cores e fonte da seção 11 no Tailwind; `src/api/client.ts` em cada um; `.env.example` de cada um; uma página inicial simples em cada site para provar que roda.
  - Arquivos compartilhados (avisar a Pessoa B): `apps/gestao/package.json`, `apps/gestao/src/App.tsx`, `apps/gestao/src/api/client.ts`.
  - Commit: `chore(sites): cria projetos pesquisa e gestao`
  - Pronto quando: `npm run dev` abre os dois sites no navegador.

- [x] **A7 · Componentes da pesquisa**
  - Branch: `feat/pesquisa-componentes`
  - O que fazer: em `apps/pesquisa/src/components/`: carinhas de 1 a 5 com rótulo em texto (RN04), botão grande, link "pular" discreto (RN07), moldura da tela da pesquisa. Usar dados de mentira por enquanto.
  - Commit: `feat(pesquisa): componentes base`

- [ ] **A8 · Cálculo de turno**
  - Branch: `feat/turno`
  - Depende de: B1
  - O que fazer: `apps/api/src/shared/shift.ts`, que recebe data e hora e devolve `shift` e `shift_date` (RN13, incluindo a madrugada), com testes unitários.
  - Commit: `feat(api): calculo de turno`
  - Pronto quando: os testes de manhã, tarde, noite e madrugada passam.

- [ ] **A9 · Dados de exemplo (seeds)**
  - Branch: `feat/seeds`
  - Depende de: B2
  - O que fazer: arquivos `.sql` em `database/seeds/` com setores, pesquisas, perguntas, equipes, escala do mês, respostas e comentários variados, e um usuário de cada perfil (senha a partir de `SEED_PASSWORD`, nunca escrita no arquivo).
  - Commit: `feat(db): dados de exemplo`

## Etapa 3 — Pesquisa funcionando

- [ ] **A10 · API pública da pesquisa**
  - Branch: `feat/pesquisa-api`
  - Depende de: B1, B2, B3, A8
  - O que fazer: módulo `apps/api/src/modules/responses/` com as rotas públicas da seção 9 do README, e as consultas SQL em `database/repositories/responses.repository.ts` e `database/supabase/responses.repository.ts`. Criar a resposta no 1º toque (RN09), salvar cada toque, calcular turno e equipe (RN13, RN14), `complete` exige a obrigatória (RN05).
  - Regras: RN01, RN02, RN05, RN08, RN09, RN12–RN14
  - Commit: `feat(responses): api publica da pesquisa`
  - Pronto quando: as rotas funcionam pelo Swagger e têm testes de integração.

- [ ] **A11 · Telas da pesquisa ligadas à API**
  - Branch: `feat/pesquisa-telas`
  - Depende de: A6, A7, A10
  - O que fazer: rotas `/:slug` e `/c/:code`; uma pergunta por tela sem contador (RN03); obrigatória por último (RN05); salvar a cada toque; tela de comentário sempre no final, depois da obrigatória (RN11); agradecimento.
  - Commit: `feat(pesquisa): telas da pesquisa`
  - Pronto quando: dá para responder uma pesquisa inteira no celular e ver os dados no banco.

- [ ] **A12 · Respostas abandonadas**
  - Branch: `feat/abandono`
  - Depende de: A10
  - O que fazer: rotina na API que muda para `ABANDONED` as respostas `PARTIAL` paradas há 30 minutos (RN10), com teste.
  - Commit: `feat(responses): respostas abandonadas`

## Etapa 4 — Dashboard, tempo real, TV Wall e Excel (site de gestão)

- [ ] **A13 · API do dashboard**
  - Branch: `feat/dashboard-api`
  - Depende de: B9, A10
  - O que fazer: módulo `dashboard` com `summary`, `questions`, `steps`, `breakdown` e `timeline` (seção 9), consultas em `dashboard.repository.ts`, filtros, mínimo de 5 respostas por equipe (RN15) e restrição ao próprio setor para admin de setor e visualizador (RN22).
  - Commit: `feat(dashboard): indicadores`

- [ ] **A14 · Tela do dashboard**
  - Branch: `feat/dashboard-tela`
  - Depende de: A13, B10
  - O que fazer: `apps/gestao/src/pages/dashboard/` e `components/charts/`, com filtros (período, setor, turno, equipe) e navegação hospital → setor → turno → equipe.
  - Commit: `feat(gestao): tela do dashboard`

- [ ] **A15 · Tempo real**
  - Branch: `feat/tempo-real`
  - Depende de: A10, A14
  - O que fazer: `apps/api/src/shared/realtime.ts` com Socket.IO; emitir `response:changed` e `comment:created`; o dashboard atualiza sozinho.
  - Commit: `feat(realtime): atualizacao ao vivo`

- [ ] **A16 · TV Wall**
  - Branch: `feat/tv-wall`
  - Depende de: A13, A15, B10
  - O que fazer: rota `GET /dashboard/tv` (só super admin) e tela `/tv` com os dashboards e **todos** os comentários (RN18); a aba só aparece para o super admin.
  - Commit: `feat(gestao): tv wall`

- [ ] **A17 · Exportar Excel**
  - Branch: `feat/excel`
  - Depende de: A13
  - O que fazer: `GET /dashboard/export.xlsx` com os filtros e o botão "Exportar Excel" no dashboard (RN19).
  - Commit: `feat(dashboard): exportar excel`

## Etapa 5 — Testes e acabamento

- [ ] **A18 · Testes E2E do paciente**
  - Branch: `test/e2e-pesquisa`
  - O que fazer: Playwright: responder tudo; fechar no meio e conferir a resposta parcial; tentar terminar sem a obrigatória.
  - Commit: `test(e2e): fluxo do paciente`

- [ ] **A19 · Swagger das suas rotas**
  - Branch: `docs/swagger-pesquisa-dashboard`
  - O que fazer: documentar as rotas públicas e as do dashboard no Swagger configurado em B1.
  - Commit: `docs(api): rotas da pesquisa e do dashboard`

- [ ] **A20 · Celular e tablet**
  - Branch: `fix/responsivo`
  - O que fazer: revisar a pesquisa em celular e tablet (toque mínimo de 56 px, contraste, texto mínimo de 18 px).
  - Commit: `fix(pesquisa): ajustes de celular e tablet`

## Etapa 6 — Entrega

- [ ] **A21 · Manual de uso**
  - Branch: `docs/manual-pesquisa-dashboard`
  - O que fazer: em `docs/manual/`, como responder a pesquisa, como ler o dashboard e como usar o TV Wall, com prints do sistema publicado e linguagem para leigos.
  - Commit: `docs: manual da pesquisa e do dashboard`
- [ ] **A22 · Juntos:** registro do processo completo, PDF de entrega e ensaio de 8 minutos (A apresenta a pesquisa, o dashboard e o TV Wall).
