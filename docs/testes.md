# Relatório de testes

Plano e resultado dos testes automáticos do sistema (README, seção 16; requisito RNF04). Feito na tarefa B17, com os testes das duas pessoas.

**Resultado em 27/10/2026: 298 testes, 298 passando, nenhum falhando.**

## 1. Como testamos

Testamos em **três estágios**, do menor pedaço até o sistema inteiro:

| Estágio | O que é | Ferramenta |
| --- | --- | --- |
| **Unitário** | Testa uma função sozinha, sem API nem banco. Exemplo: "uma resposta às 03:00 é do plantão da noite anterior?" | Vitest |
| **Integração** | Testa várias partes juntas: a rota da API, as regras e o banco. Também testa cada tela do site com a API simulada | Vitest, Supertest, Testing Library, PGlite |
| **E2E (ponta a ponta)** | Um robô abre o navegador de verdade e usa o sistema como uma pessoa: toca nas carinhas, faz login, clica nos botões | Playwright + Microsoft Edge |

**Os testes nunca tocam no banco do Supabase**, que é compartilhado pela dupla. Quando um teste precisa de banco, ele cria um **PostgreSQL de verdade, mas em memória** (PGlite). Esse banco recebe as mesmas migrations (`database/migrations/`) e os mesmos dados de exemplo (`database/seeds/`) do banco real, e some quando o teste termina. Assim, o SQL testado é exatamente o SQL que roda no Supabase.

Alguns testes de regras usam um **banco de mentira** (`apps/api/tests/fakes.ts`): uma lista na memória que imita os repositórios. Eles são mais rápidos e servem para testar as regras de permissão e de validação, sem depender do SQL.

## 2. Como rodar

Na pasta raiz do projeto (PowerShell). Nenhum precisa do `.env` nem da internet.

| Comando | O que roda |
| --- | --- |
| `npm run test:api` | Unitários e integração da API (inclui o SQL em banco em memória) |
| `npm run test:schemas` | Validações Zod do pacote `@avaliacoes/schemas` |
| `npm run test:gestao` | Telas do site de gestão |
| `npm test --workspace pesquisa` | Telas do site da pesquisa |
| `npm run test:e2e` | E2E do paciente (liga sozinho uma API de teste na porta 3399 e o site na 5199) |
| `npm run test:e2e:gestao` | E2E da gestão (liga sozinho uma API de teste na porta 3398 e o site na 5198) |

## 3. Resultado por estágio

| Estágio | Testes | Passando |
| --- | --- | --- |
| Unitário | 25 | 25 |
| Integração da API com banco de mentira (regras, permissões e documentação) | 98 | 98 |
| Integração da API com SQL de verdade (banco em memória) | 92 | 92 |
| Integração das telas (sites com a API simulada) | 74 | 74 |
| E2E no navegador | 9 | 9 |
| **Total** | **298** | **298** |

## 4. Resultado por arquivo

A = Estefanie · B = Rafaela.

### Unitário

| Arquivo | Dono | Testes | O que confere |
| --- | --- | --- | --- |
| `apps/api/tests/shift.test.ts` | A | 6 | Turnos (RN13): manhã, tarde, noite; madrugada pertence ao plantão da noite anterior, inclusive na virada do mês e do ano; usa o horário de Brasília |
| `apps/api/tests/abandonment.test.ts` | A | 3 | Rotina de abandono (RN10): roda a cada minuto, não para a API se o banco falhar e não começa duas vezes ao mesmo tempo |
| `packages/schemas/tests/schemas.test.ts` | B | 10 | Schemas Zod: setor precisa de link, e o link não pode ser reservado (RN01); perfis e setor de cada perfil (RN16); etapas (RN06); carinha de 1 a 5 (RN04); resposta nasce parcial (RN09); comentário (RN11, RN17) |
| `apps/api/tests/schemas-package.test.ts` | B | 1 | A API usa o pacote de schemas compartilhado |
| `apps/gestao/src/auth/menu.test.ts` | B | 5 | Quem vê cada aba (RN16): só o super admin vê Setores e Usuários; o TV Wall não está no menu, é só um link (RN18) |

### Integração da API com banco de mentira

| Arquivo | Dono | Testes | O que confere |
| --- | --- | --- | --- |
| `apps/api/tests/app.test.ts` | B | 3 | API no ar, erro 404 no formato padrão, Swagger abre em `/api/docs` |
| `apps/api/tests/auth.test.ts` | B | 14 | Login: token de 8 horas; mesma mensagem para senha errada, e-mail inexistente e usuário desativado; token inválido ou vencido → 401; os filtros de perfil e de setor usados por todas as rotas fechadas (RN16) |
| `apps/api/tests/users.test.ts` | B | 24 | Usuários (RN16): só o super admin vê, cadastra, altera e desativa usuários, de qualquer perfil; admin de setor e visualizador recebem 403; ninguém desativa a si mesmo; senha nunca é devolvida; "Minha senha" |
| `apps/api/tests/sectors.test.ts` | B | 16 | Setores (RN01): link `/avaliacao/<slug>`, sem código curto; link reservado → 400; o link nunca muda; o QR Code é exatamente o do link da pesquisa, só para os admins, cada um do seu setor |
| `apps/api/tests/realtime.test.ts` | A | 3 | Tempo real: sem login não conecta; cada perfil só recebe avisos do próprio setor; o canal público do TV Wall conecta sem login e só recebe respostas, nunca comentários (RN18) |
| `apps/api/tests/swagger.test.ts` | B | 38 | A documentação bate com a API: cada uma das 36 rotas com cadeado responde 401 sem login e documenta o 401; nenhuma referência quebrada |

### Integração da API com SQL de verdade (banco em memória)

| Arquivo | Dono | Testes | O que confere |
| --- | --- | --- | --- |
| `apps/api/tests/migrations.test.ts` | B | 2 | Todas as migrations rodam em ordem e criam as 9 tabelas e os índices; a coluna do código curto foi apagada (migration 004); a busca do dashboard usa o índice da migration 003 |
| `apps/api/tests/responses.test.ts` | A | 16 | Pesquisa do paciente: obrigatória por último (RN05); o link pelo código curto não existe mais (RN01); primeiro toque cria a resposta (RN09); turno e equipe calculados (RN13, RN14); terminar sem a obrigatória → 400 `REQUIRED_MISSING` |
| `apps/api/tests/dashboard.test.ts` | A | 27 | Indicadores (RN20, RN21), "dados insuficientes" abaixo de 5 respostas (RN15), filtros e setor de cada perfil (RN22), Excel (RN19); TV Wall sem login só com percentuais, sem comentários, quantidades ou equipes (RN18, D5); relatório do setor em PDF, conferindo o texto escrito no arquivo e quem pode baixar (RN23) |
| `apps/api/tests/surveys.test.ts` | B | 11 | Pesquisa nasce desativada e com a obrigatória (RN05); ativar uma desativa a outra do setor (RN02); ordem das perguntas |
| `apps/api/tests/schedules.test.ts` | B | 11 | Equipes desativadas, não apagadas; salvar a escala passa as respostas para a equipe (RN14); equipe de outro setor → nada é gravado |
| `apps/api/tests/comments.test.ts` | B | 10 | Comentários: mais novos primeiro; filtros; período no horário de Brasília; tratar exige anotação e reabrir mantém a anotação (RN17) |
| `apps/api/tests/users-sectors-sql.test.ts` | B | 4 | SQL de usuários e setores: lista em ordem alfabética, e-mail repetido recusado pelo próprio banco, link repetido → 409 |
| `apps/api/tests/gestao-integracao.test.ts` | B | 11 | A API inteira com todos os dados de exemplo e login de verdade dos 3 perfis: permissões (RN16, D8; só o super admin mexe em usuários), cadastro de setor até a pesquisa aparecer para o paciente, escala, comentários e TV Wall sem comentários |

### Integração das telas

| Arquivo | Dono | Testes | O que confere |
| --- | --- | --- | --- |
| `apps/gestao/src/App.test.tsx` | B | 7 | Login, menu do perfil, "Sem permissão" ao abrir uma tela proibida pelo endereço; o TV Wall abre pelo link sem login e sem menu (RN18) |
| `apps/gestao/src/pages/setores/SectorsPage.test.tsx` | B | 7 | Link `/avaliacao/<slug>` e um só botão de QR Code (RN01); link gerado a partir do nome; desativar pede confirmação |
| `apps/gestao/src/pages/usuarios/UsersPage.test.tsx` | B | 9 | Super admin escolhe perfil e setor; senha com 8 caracteres ou mais; a própria conta não pode ser desativada; tela "Minha senha" |
| `apps/gestao/src/pages/pesquisas/Surveys.test.tsx` | B | 6 | Ativar avisa que a outra pesquisa será desativada; obrigatória por último e travada; aviso ao mudar pergunta já respondida |
| `apps/gestao/src/pages/escala/SchedulePage.test.tsx` | B | 4 | Equipe desativada não aparece como opção; salvar mostra quantas respostas mudaram de equipe; visualizador só olha |
| `apps/gestao/src/pages/comentarios/CommentsPage.test.tsx` | B | 6 | Data no horário de Brasília; tratar exige anotação; reabrir; visualizador sem botões |
| `apps/gestao/src/pages/dashboard/DashboardPage.test.tsx` | A | 11 | Nota com 1 casa decimal; navegação hospital → setor → turno → equipe (RN22); tempo real; relatório do setor só para os admins (RN23) |
| `apps/gestao/src/pages/tv-wall/TvWallPage.test.tsx` | A | 7 | Barras em percentual, últimos 30 dias, filtros de período e setor, nenhum comentário nem quantidade (RN18, D5); atualização ao vivo só pelo setor da tela |
| `apps/gestao/src/components/charts/FaceDistribution.test.tsx` | A | 1 | Respostas por carinha do dashboard, da melhor para a pior, com quantidade e % (RN20) |
| `apps/gestao/src/components/ui/SectorReportDownload.test.tsx` | B | 3 | "Baixar relatório (PDF)": começa no mês atual, baixa o mês escolhido, fica desligado sem setor, mostra o erro da API (RN23) |
| `apps/pesquisa/src/pages/SurveyPage.test.tsx` | A | 8 | Abre pelo link `/avaliacao/<slug>` (RN01); uma pergunta por tela, sem contador (RN02, RN03); salvar a cada toque (RN09); comentário depois da obrigatória (RN11) |
| `apps/pesquisa/src/components/FaceScale.test.tsx` | A | 3 | 5 carinhas com o rótulo em texto, sem depender só da cor, da melhor para a pior: Ótimo em cima (RN04) |
| `apps/pesquisa/src/components/SkipLink.test.tsx` | A | 1 | "Pular" discreto (RN07) |
| `apps/pesquisa/src/components/SurveyFrame.test.tsx` | A | 1 | Aviso de pesquisa anônima, sem contador (RN03, RN08) |

### E2E no navegador

| Arquivo | Dono | Testes | O que confere |
| --- | --- | --- | --- |
| `apps/pesquisa/e2e/paciente.spec.ts` | A | 3 | Paciente responde tudo até o agradecimento; fecha no meio e o que respondeu fica salvo como parcial (RN09, D7); não consegue terminar sem a obrigatória |
| `apps/gestao/e2e/gestao.spec.ts` | B | 6 | Senha errada; super admin vê todas as abas e o TV Wall não está no menu; TV Wall abre sem login, só com percentuais, e filtra por setor; admin de setor não vê Setores nem Usuários e recebe "Sem permissão" pelo endereço; tratar e reabrir comentário; visualizador só olha |

## 5. Regras de negócio x testes

Cada regra do README (seção 3) e onde ela é testada. U = unitário, I = integração, E = E2E.

| Regra | Testada em |
| --- | --- |
| RN01 Link e código do setor | U: `schemas` · I: `sectors`, `users-sectors-sql`, `responses`, `SectorsPage` |
| RN02 Uma pesquisa ativa, uma pergunta por tela | I: `surveys`, `Surveys`, `SurveyPage` · E: paciente |
| RN03 Nunca mostrar contador | I: `SurveyPage`, `SurveyFrame` · E: paciente |
| RN04 Carinhas de 1 a 5 | U: `schemas` · I: `responses`, `FaceScale` |
| RN05 Uma obrigatória, na última tela | I: `surveys`, `responses`, `gestao-integracao`, `Surveys` · E: paciente |
| RN06 Etapas da jornada | U: `schemas` · I: `dashboard` (média por etapa) |
| RN07 "Pular" discreto | I: `SkipLink`, `SurveyPage` · E: paciente |
| RN08 Anonimato | I: `responses` (nenhuma tabela tem coluna de dado pessoal), `dashboard` (o Excel não tem coluna de dado pessoal), `SurveyFrame` |
| RN09 Salvar a cada toque | I: `responses`, `SurveyPage` · E: paciente |
| RN10 Parcial, abandonada e completa | U: `abandonment` · I: `responses`, `dashboard` · E: paciente |
| RN11 Comentário opcional no final | I: `responses`, `SurveyPage` · E: paciente |
| RN12 Setor, data, hora e turno gravados | I: `responses` |
| RN13 Turnos e madrugada | U: `shift` · I: `responses` |
| RN14 Escala e equipe | I: `schedules`, `gestao-integracao`, `responses`, `SchedulePage` |
| RN15 Mínimo de 5 respostas por equipe | I: `dashboard` |
| RN16 Três perfis | U: `menu` · I: `auth`, `users`, `sectors`, `surveys`, `schedules`, `comments`, `gestao-integracao`, `realtime` · E: gestão |
| RN17 Tratar e reabrir comentário | I: `comments`, `gestao-integracao`, `CommentsPage` · E: gestão |
| RN18 TV Wall público, só com percentuais | U: `menu` · I: `dashboard`, `gestao-integracao`, `realtime`, `App`, `TvWallPage` · E: gestão |
| RN19 Excel | I: `dashboard` |
| RN20 e RN21 Médias | I: `dashboard`, `DashboardPage` |
| RN22 Filtros e setor de cada perfil | I: `dashboard`, `DashboardPage` |
| RN23 Relatório do setor em PDF | I: `dashboard`, `DashboardPage`, `SectorReportDownload` |

## 6. O que os testes automáticos não cobrem

- **A conexão com o Supabase de verdade.** Os testes usam o banco em memória com o mesmo SQL. A conexão real é conferida à mão, usando o sistema ligado ao Supabase.
- **O sistema publicado.** A lista de conferência da seção 18 do README é feita à mão no endereço publicado, antes da entrega.
- **Muitos acessos ao mesmo tempo (teste de carga).** Não foi feito. A medição de velocidade do índice da migration 003 está em `docs/banco-de-dados.md`.
- **Navegadores diferentes do Edge.** O E2E roda no Edge do Windows. Os tamanhos de celular e tablet foram conferidos à mão no navegador (tarefa A20).

## 7. Problemas encontrados pelos testes

- **Tempo limite.** Rodando todos os testes juntos num computador mais lento, criar o banco em memória passava de 10 segundos e alguns testes falhavam só por demora. Aumentamos o tempo limite (30 s na API e 20 s nas telas da gestão), sem mudar nenhum teste.
- **Senha nos dados de exemplo.** O hash da senha tem o caractere `$`, que o `replace` do JavaScript trata como comando especial. O comando `npm run db:seed` já usava `split/join` para evitar isso, e os testes passaram a fazer igual.
- **Repositórios de usuários e setores.** Eles não aceitavam o banco em memória, então o SQL deles não era testado. Foram ajustados para receber o banco de fora, como os outros (tarefa B16).
