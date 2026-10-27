# Requisitos e matriz de rastreabilidade

Especificação de requisitos do sistema e matriz que liga **cada pedido do briefing** ao requisito (RF), à regra de negócio (RN) ou decisão da dupla (D), à tela, à rota da API e ao teste que comprova que funciona. Feito na tarefa B6.

As regras (RN01 a RN22), as decisões (D1 a D8) e os contratos completos estão no [README](../README.md). As justificativas das decisões estão em [decisoes.md](decisoes.md), e os testes, em [testes.md](testes.md).

## 1. De onde vieram os pedidos

| Fonte | O que traz |
| --- | --- |
| **Enunciado do Projeto Aplicado** | O problema do hospital, as funcionalidades pedidas pelo cliente e as decisões que ficam com a dupla |
| **Enunciado de Solução Web Corporativa** | Os entregáveis técnicos: requisitos, banco, API documentada, testes, repositório e pitch |
| **Reunião com o cliente** (anotações da dupla) | Detalhes de como o hospital FHDOD quer usar o sistema |

Cada pedido recebeu um código: **P** = funcionalidade do enunciado, **C** = dor do cliente, **R** = pedido da reunião, **E** = entregável.

## 2. Requisitos

### Requisitos funcionais

| ID | Requisito | Regras e decisões | Situação |
| --- | --- | --- | --- |
| RF01 | Super admin cadastra setores e todos os usuários | RN16, D8 | Feito e testado |
| RF02 | Admins cadastram pesquisas e perguntas | RN02, RN05, RN16 | Feito e testado |
| RF03 | URL e QR Code por setor | RN01 | Feito e testado |
| RF04 | Uma pergunta por tela, sem contador | RN02, RN03 | Feito e testado |
| RF05 | Carinhas de 1 a 5; uma obrigatória na última tela; "pular" discreto | RN04, RN05, RN07, D1, D2 | Feito e testado |
| RF06 | Perguntas por etapa da jornada | RN06 | Feito e testado |
| RF07 | Anonimato total | RN08, D3 | Feito e testado |
| RF08 | Salvar a cada toque; tratar abandono | RN09, RN10, D7 | Feito e testado |
| RF09 | Comentário anônimo opcional | RN11, D3 | Feito e testado |
| RF10 | Rastreabilidade (setor, data, hora, turno) | RN12, RN13 | Feito e testado |
| RF11 | Escala mensal e cruzamento com a equipe | RN14, RN15, D4 | Feito e testado |
| RF12 | Perfis de acesso | RN16, D8 | Feito e testado |
| RF13 | Comentários: ler e marcar como tratado | RN17 | Feito e testado |
| RF14 | Dashboard em tempo real com filtros e navegação | RN20, RN21, RN22 | Feito e testado |
| RF15 | TV Wall público, só com percentuais | RN18, D5 | Feito e testado |
| RF16 | Exportar Excel | RN19 | Feito e testado |
| RF17 | Celular e tablet, só toques, botões grandes | README seção 11, D6 | Feito; tamanhos de tela conferidos à mão (tarefa A20) |
| RF18 | Relatório do setor em PDF, por mês | RN23 | Feito e testado |

### Requisitos não funcionais

| ID | Requisito | Como é atendido | Situação |
| --- | --- | --- | --- |
| RNF01 | Banco fácil de substituir | Só a API acessa o banco; os módulos usam interfaces; só a pasta `supabase/` conhece o Supabase; SQL padrão, sem Supabase Auth ([banco-de-dados.md](banco-de-dados.md)) | Feito; os testes trocam o Supabase por um banco em memória sem mudar nenhum módulo |
| RNF02 | Manual simples para leigo | `docs/manual/`, com prints do sistema publicado | A fazer (tarefas A21 e B18) |
| RNF03 | API documentada em Swagger | `/api/docs`, com todas as rotas e erros | Feito; teste confere que a documentação bate com a API |
| RNF04 | Testes unitários, de integração e E2E | 281 testes automáticos ([testes.md](testes.md)) | Feito |

## 3. Matriz de rastreabilidade

**Situação:** ✅ atendido · 🔁 atendido de outro jeito, por decisão da dupla · ⏳ a fazer · ❓ pendente de decisão.

Nos testes, os nomes são dos arquivos em `apps/api/tests/` (API), `apps/gestao/` e `apps/pesquisa/` (telas) e `e2e/` (navegador).

### 3.1 Funcionalidades pedidas no enunciado

| # | Pedido do briefing | RF | Regras e decisões | Tela | Rota da API | Teste | Situação |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P01 | Pesquisa por setor (Pronto Atendimento, Internação, Raio-X etc.), cada um com URL e QR Code próprios | RF03 | RN01 | Pesquisa: `/:slug` e `/c/:code` · Gestão: Setores | `POST /sectors`, `GET /sectors/:id/qrcode`, `GET /public/sectors/:slug`, `GET /public/sectors/by-code/:code` | `sectors`, `users-sectors-sql`, `responses`, `SectorsPage`, `SurveyPage` | ✅ |
| P02 | Apenas uma pergunta obrigatória (classificação geral do hospital); as demais opcionais | RF05 | RN05, D2 | Pesquisa: última tela de perguntas · Gestão: Pesquisas | `POST /surveys`, `POST /public/responses/:id/complete` | `surveys`, `responses`, `gestao-integracao`, `Surveys`, E2E paciente | ✅ |
| P03 | Experiência só por toques: rostinhos, botões grandes, etapas curtas, no celular e no tablet | RF04, RF05, RF17 | RN02, RN03, RN04, RN07, D1, D6 | Pesquisa: todas as telas | `POST /public/responses`, `PUT /public/responses/:id/answers/:questionId` | `FaceScale`, `SkipLink`, `SurveyPage`, E2E paciente | ✅ |
| P04 | Perguntas organizadas pela jornada (Recepção, Triagem, Enfermagem, Médico), exibidas só quando fizerem sentido | RF06 | RN06 | Gestão: Pesquisas (etapa de cada pergunta) | `POST /surveys/:id/questions`, `GET /dashboard/steps` | `schemas`, `surveys`, `dashboard` | ✅ Cada setor cadastra só as etapas que fazem sentido para ele |
| P05 | Espaço para elogio, reclamação ou sugestão | RF09 | RN11, D3 | Pesquisa: tela de comentário · Gestão: Comentários | `POST /public/responses/:id/comment`, `GET /comments` | `responses`, `comments`, `CommentsPage`, E2E paciente | ✅ |
| P06 | Opção de anonimato **ou** de deixar telefone para retorno da Ouvidoria | RF07 | RN08, D3 | — | — | `responses` e `dashboard` (nenhuma coluna de dado pessoal) | 🔁 A pesquisa é **sempre** anônima e não pede telefone (D3): o paciente fica seguro para ser sincero e o hospital não guarda dado protegido pela LGPD |
| P07 | Cruzar a avaliação com a escala mensal (setor + data + turno) para identificar a equipe | RF11 | RN13, RN14, RN15, D4 | Gestão: Escala | `GET/PUT /schedules`, `GET/POST /teams` | `shift`, `schedules`, `responses`, `gestao-integracao`, `SchedulePage` | ✅ |
| P08 | Perfis de acesso (Super Admin, Admin de Setor, Gestão, Ouvidoria, Visualizador) | RF12 | RN16, D8 | Gestão: Login, menu, Usuários | `POST /auth/login`, `/users` | `auth`, `users`, `gestao-integracao`, `menu`, `App`, E2E gestão | 🔁 A dupla decidiu por **3 perfis** (D8): super admin, admin de setor e visualizador. Ver pendência 6.1 |
| P09 | Dashboard em tempo real, navegando do hospital até o setor, turno e equipe | RF14 | RN20, RN21, RN22 | Gestão: Dashboard | `/dashboard/summary`, `/questions`, `/steps`, `/breakdown`, `/timeline`; evento `response:changed` | `dashboard`, `realtime`, `DashboardPage` | ✅ |
| P10 | TV Wall com indicadores para exibição em tela | RF15 | RN18, D5 | Gestão: TV Wall (`/tv`, sem login) | `GET /public/tv` | `dashboard`, `TvWallPage`, E2E gestão | ✅ Só gráficos em percentual, com filtro de período e setor |
| P11 | Exportação dos dados em Excel | RF16 | RN19 | Gestão: Dashboard (botão "Exportar Excel") | `GET /dashboard/export.xlsx` | `dashboard` | ✅ |

### 3.2 Dores do cliente

| # | Dor relatada | Como o sistema resolve | Regras e decisões | Situação |
| --- | --- | --- | --- | --- |
| C01 | Cerca de 3 respostas para cada 500 atendimentos | QR Code no setor, resposta pelo celular do próprio paciente, só com toques e sem contador | D6, D1, RN03 | ✅ |
| C02 | Formulários incompletos, muitos sem data | Cada toque é salvo na hora; a data, a hora e o turno são gravados sozinhos | RN09, RN12, D7 | ✅ |
| C03 | Reclamações escritas no verso da folha | Tela de comentário com o tipo (elogio, reclamação ou sugestão) | RN11 | ✅ |
| C04 | Não se sabe o setor, o turno ou a equipe | Cada setor tem o seu link; o turno é calculado; a equipe vem da escala | RN01, RN12, RN13, RN14 | ✅ |
| C05 | Só os insatisfeitos respondem e os elogios se perdem | Pesquisa rápida e anônima; o elogio tem tipo próprio e aparece para os gestores na aba Comentários | D3, RN11, RN17 | ✅ Ver pendência 6.2 |
| C06 | Horas transcrevendo o papel para planilhas | As respostas vão direto para o dashboard; Excel pronto com os filtros | RN19, RN22 | ✅ |

### 3.3 Pedidos da reunião com o cliente

| # | Pedido | Regras e decisões | Tela | Rota da API | Teste | Situação |
| --- | --- | --- | --- | --- | --- | --- |
| R01 | O ADM faz tudo e cadastra os gestores de cada setor | RN16, D8 | Gestão: Usuários, Setores | `/users`, `/sectors` | `users`, `gestao-integracao` | ✅ |
| R02 | Cadastrar a pesquisa; as perguntas passam uma por vez, sem aparecer todas juntas | RN02 | Gestão: Pesquisas · Pesquisa: uma pergunta por tela | `/surveys`, `/surveys/:id/questions` | `surveys`, `SurveyPage` | ✅ |
| R03 | Botão "pular" bem escondido | RN07 | Pesquisa: link pequeno abaixo das carinhas | — | `SkipLink`, E2E paciente | ✅ |
| R04 | Pergunta obrigatória em NPS, cadastrada pelo ADM | RN05, D1 | Gestão: Pesquisas | `POST /surveys`, `PUT /questions/:id` | `surveys`, `Surveys` | 🔁 Carinhas de 1 a 5 em vez de NPS (D1). A pesquisa já nasce com a obrigatória, e o admin pode mudar o texto dela |
| R05 | Se o paciente fechar antes do fim, não perder o que já respondeu | RN09, RN10, D7 | Pesquisa | `POST /public/responses`, `PUT /public/responses/:id/answers/:questionId` | `responses`, `abandonment`, E2E paciente ("fecha no meio") | ✅ |
| R06 | Telefone e observação no final, com aceite da LGPD (para todos ou só para nota baixa) | RN08, RN11, D3 | Pesquisa: tela de comentário | `POST /public/responses/:id/comment` | `responses` | 🔁 Sem telefone (D3). A tela de comentário aparece **para todos** no final (RN11). Como nenhum dado pessoal é guardado, não há aceite da LGPD. Ver pendência 6.3 |
| R07 | O que fazer se o paciente só cancelar | RN10, RN11 | Pesquisa | — | `responses`, `abandonment`, `SurveyPage` | ✅ O comentário pode ficar em branco; quem fecha no meio vira "abandonada" depois de 30 minutos, e o que respondeu conta nos indicadores |
| R08 | Dashboard com filtro por setor; setores cadastrados pelo ADM | RN22, RF01 | Gestão: Dashboard, Setores | `/dashboard/*`, `/sectors` | `dashboard`, `sectors` | ✅ |
| R09 | O dashboard não é a mesma coisa que o TV Wall | RN18, D5 | Gestão: Dashboard (`/`) e TV Wall (`/tv`) | `/dashboard/summary` e `/public/tv` | `DashboardPage`, `TvWallPage` | ✅ Telas separadas |
| R10 | Cada pesquisa com URL separada: `site/setor` ou código | RN01 | Pesquisa: `/:slug` e `/c/:code` | `GET /public/sectors/:slug`, `GET /public/sectors/by-code/:code` | `responses`, `SurveyPage` | ✅ |
| R11 | Tela do ADM com cada reclamação, para marcar "entrei em contato", fechar o chamado e relatar o que aconteceu | RN17, D3 | Gestão: Comentários | `GET /comments`, `PATCH /comments/:id` | `comments`, `gestao-integracao`, `CommentsPage`, E2E gestão | 🔁 O gestor marca como **tratado**, escrevendo obrigatoriamente o que foi feito, e pode reabrir. Sem telefone (D3), não há contato de volta com o paciente |
| R12 | Cada manifestação da Ouvidoria com um número | — | — | — | — | ❓ Ver pendência 6.4 |
| R13 | Sabendo a hora, saber quem estava de plantão e em qual setor | RN12, RN13, RN14, D4 | Gestão: Escala, Dashboard (por equipe) | `/schedules`, `/dashboard/breakdown?by=team` | `shift`, `schedules`, `dashboard` | ✅ Pela equipe do plantão, nunca por pessoa (D4) |
| R14 | Rastreabilidade: origem, turno, telefone e dia | RN12, RN13, D3 | — | — | `responses` | 🔁 Gravados: setor, data, hora e turno. A origem (QR, link ou tablet) não é diferenciada (RN12, decisão da dupla) e o telefone não é pedido (D3) |
| R15 | Cliente: hospital FHDOD | README seção 2 | Todas | — | — | ✅ Identidade visual em [guia-de-estilos.md](guia-de-estilos.md) |
| R16 | Documento de uso: o usuário é leigo | RNF02 | — | — | — | ⏳ Manual em `docs/manual/` (tarefas A21 e B18) |
| R17 | A resposta vai ser com carinhas | RN04, D1 | Pesquisa | — | `FaceScale` | ✅ |
| R18 | Nunca mostrar o número de perguntas | RN03 | Pesquisa | — | `SurveyPage`, `SurveyFrame`, E2E paciente | ✅ |

### 3.4 Decisões que o enunciado deixou com a dupla

O enunciado pede no mínimo quatro. A dupla respondeu cinco das sete questões, com oito decisões.

| Questão do enunciado | Decisão | Onde aparece |
| --- | --- | --- |
| A obrigatória deve ser NPS (0 a 10) ou rostinhos (1 a 5)? No início ou no fim? | **D1** (carinhas de 1 a 5 em todas) e **D2** (obrigatória na última tela) | Pesquisa |
| A partir de qual nota encaminhar o paciente à Ouvidoria? | Não escolhida: a tela de comentário aparece para todos (RN11) | Ver pendência 6.3 |
| Como estimular quem teve uma boa experiência a responder? | Não escolhida | Ver pendência 6.2 |
| Como vincular a avaliação à equipe sem responsabilizar injustamente um profissional? | **D4** (pela escala, nunca por pessoa; mínimo de 5 respostas) | Escala, Dashboard |
| LGPD: quais dados guardar, por quanto tempo e quem vê o telefone? | **D3** (nenhum dado pessoal; não há telefone) | Pesquisa, banco |
| O que pode aparecer num TV Wall exposto ao público? | **D5** (link público, só com gráficos em percentual; sem comentários, números ou equipes) | TV Wall |
| Totem, tablet ou celular? | **D6** (celular pelo QR Code; tablet como apoio) | Pesquisa |

Também foram decididos: **D7** (salvar a cada toque) e **D8** (três perfis).

## 4. Entregáveis

| # | Entregável | Disciplina | Onde está | Situação |
| --- | --- | --- | --- | --- |
| E01 | Personas (paciente e gestão) | Projeto Aplicado | [personas.md](personas.md) | ✅ |
| E02 | Figma: fluxo do paciente, do QR Code ao agradecimento | Projeto Aplicado | Figma (fora do git) | ⏳ Tarefas A4 e B8. Ver pendência 6.3 |
| E03 | Mock em alta fidelidade com as decisões indicadas | Projeto Aplicado | Figma (fora do git) | ⏳ Tarefas A5 e B8 |
| E04 | Front publicado com link | Projeto Aplicado | — | ❓ Onde publicar ainda está **(a definir)** (README, seção 17) |
| E05 | Manual de uso para leigo | Projeto Aplicado | `docs/manual/` | ⏳ Tarefas A21 e B18 |
| E06 | Registro do processo | Projeto Aplicado | [registro-processo.md](registro-processo.md) | Em andamento (uma linha por tarefa) |
| E07 | Requisitos e matriz de rastreabilidade | Solução Web | Este documento | ✅ |
| E08 | Jornadas, fluxos, wireframes e guia de estilos | Solução Web | Figma + [guia-de-estilos.md](guia-de-estilos.md) | Guia ✅ · Figma ⏳ |
| E09 | Relatório SQL x NoSQL, modelos e scripts DDL/DML | Solução Web | [banco-de-dados.md](banco-de-dados.md), `database/migrations/`, `database/seeds/` | ✅ |
| E10 | API documentada (Swagger) | Solução Web | `/api/docs` | ✅ |
| E11 | Testes em estágios e relatório | Solução Web | [testes.md](testes.md) | ✅ |
| E12 | Repositório git | Solução Web | GitHub | ✅ |
| E13 | Plano de negócios | Solução Web | — | Fora do escopo por enquanto (decisão da dupla, README seção 1) |
| E14 | Pitch / apresentação de 8 minutos | As duas | — | ⏳ Tarefas A22 e B19 |

## 5. Validação com o cliente

O enunciado de Solução Web pede para **validar os requisitos coletados** com o cliente. Os pontos marcados com 🔁 mudam o que foi pedido e devem ser apresentados ao cliente com a justificativa de cada decisão:
- **sem telefone** (P06, R06, R11, R14 → D3);
- **3 perfis em vez de 5** (P08 → D8);
- **carinhas em vez de NPS** (R04 → D1).

## 6. Pendências para a dupla decidir

Itens que este documento **não decide**. Depois da decisão, atualizar o README (seção 14) e esta matriz.

1. **Perfis "Gestão" e "Ouvidoria" (P08).** O briefing lista cinco perfis; o sistema tem três (D8). Falta registrar como as pessoas da Gestão e da Ouvidoria vão usar o sistema: com qual dos três perfis, e em qual setor.
2. **Estimular quem teve boa experiência (C05).** A questão do enunciado não foi escolhida. O enunciado só exige quatro, e a dupla já tem oito decisões; decidir se vale responder.
3. **Caminho da nota baixa (R06).** A rubrica do Figma pede o "caminho alternativo quando a nota for baixa" e cita o caminho da Ouvidoria. No sistema, a tela de comentário aparece **para todos**, com qualquer nota (RN11). Falta decidir como mostrar isso no Figma (tarefas A4 e B8).
4. **Número de cada manifestação (R12).** Cada comentário tem um número interno no banco, mas a tela de Comentários não mostra um número de protocolo. Decidir se o número deve aparecer na tela.
5. **Onde publicar (E04).** README, seção 17.
