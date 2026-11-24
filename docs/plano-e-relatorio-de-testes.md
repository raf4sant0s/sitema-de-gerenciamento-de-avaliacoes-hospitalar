# Plano e relatório de testes

Estratégia de qualidade, plano de testes e evidências da execução. Entregável da disciplina de Criação de Sites. O detalhamento arquivo por arquivo, com as regras de negócio cobertas por cada teste, está em [testes.md](testes.md).

## 1. Estratégia de qualidade

Os testes foram feitos em **três níveis**, do menor pedaço até o sistema inteiro:

| Nível | O que testa | Exemplo | Ferramentas |
| --- | --- | --- | --- |
| Unitário | Uma função sozinha, sem API nem banco | "Uma resposta às 03:00 pertence ao plantão da noite anterior?" (RN13) | Vitest |
| Integração | Rota da API + regras + banco; cada tela com a API simulada | "Admin de setor não consegue ver outro setor (403)" (RN16) | Vitest, Supertest, Testing Library, PGlite |
| E2E (ponta a ponta) | Um robô usa o sistema no navegador, como uma pessoa | "Paciente fecha no meio e o que respondeu fica salvo" (RN09) | Playwright + Microsoft Edge |

**Técnicas:**

- **Banco em memória (PGlite):** os testes criam um PostgreSQL de verdade, temporário, com as mesmas migrations e os mesmos seeds do sistema. O SQL testado é o mesmo que roda no Supabase, e o banco de produção nunca é tocado.
- **Repositórios falsos** (`apps/api/tests/fakes.ts`): listas em memória que imitam o banco, para testar regras e permissões rapidamente.
- **Testes de permissão:** cada perfil (super admin, admin de setor e visualizador) tenta fazer o que pode e o que não pode.
- **Testes por regra de negócio:** cada regra importante (turno, mínimo de 5 respostas, pergunta obrigatória, anonimato, TV Wall só com percentuais) tem pelo menos um teste.
- **Teste da documentação:** confere que o Swagger tem todas as rotas que a API realmente oferece.

## 2. Plano de testes

| Área | O que é verificado | Nível |
| --- | --- | --- |
| Pesquisa do paciente | Abrir pelo setor, salvar a cada toque, pular, obrigatória por último, comentário, concluir | Integração + E2E |
| Turno e escala | Manhã, tarde, noite, madrugada, virada de mês e ano; ligação com a equipe | Unitário + Integração |
| Login e perfis | Senha certa e errada, token vencido, cada perfil só no que pode | Integração |
| Cadastros | Setores, QR Code, usuários, pesquisas, perguntas, equipes e escala | Integração |
| Comentários | Filtrar, tratar (com anotação obrigatória) e reabrir | Integração + E2E |
| Dashboard | Médias, mínimo de 5 respostas por equipe, filtros, Excel, PDF | Unitário + Integração |
| TV Wall | Abre sem login, só percentuais, sem comentários nem números | Integração + E2E |
| Respostas abandonadas | `PARTIAL` parada há 30 min vira `ABANDONED` | Integração |

**Como rodar** (na raiz do projeto, sem precisar de `.env` nem de internet):

| Comando | O que roda |
| --- | --- |
| `npm run test:api` | Unitários e integração da API |
| `npm run test:schemas` | Validações Zod |
| `npm run test:gestao` | Telas do site de gestão |
| `npm test --workspace pesquisa` | Telas do site da pesquisa |
| `npm run test:e2e` | E2E do paciente |
| `npm run test:e2e:gestao` | E2E da gestão |

## 3. Resultado da execução

| Nível | Testes | Passando |
| --- | --- | --- |
| Unitário | 25 | 25 |
| Integração da API com banco falso (regras, permissões e documentação) | 98 | 98 |
| Integração da API com SQL real (banco em memória) | 92 | 92 |
| Integração das telas | 74 | 74 |
| E2E no navegador | 9 | 9 |
| **Total** | **298** | **298 (100%)** |

## 4. Cobertura de código da API

Medida em 24/11/2026 com Vitest + V8 (`npx vitest run --coverage` em `apps/api`), rodando os 200 testes da API:

| Métrica | Cobertura |
| --- | --- |
| Linhas | **95,05%** (1000 de 1052) |
| Comandos (statements) | **93,7%** (1086 de 1159) |
| Funções | **95,3%** (325 de 341) |
| Desvios (if/else) | **82,07%** (380 de 463) |

## 5. Falhas encontradas e corrigidas antes da entrega

| Problema | Correção |
| --- | --- |
| Em computador mais lento, testes falhavam só por demora ao criar o banco em memória | Tempo limite maior (30 s na API, 20 s nas telas), sem mudar os testes |
| O `$` do hash da senha quebrava os dados de exemplo no `replace` do JavaScript | Troca por `split/join` no seed e nos testes |
| O SQL de usuários e setores não era testado | Repositórios ajustados para receber o banco de fora, como os outros |
| Em celulares pequenos, o "Ótimo" e o "pular" ficavam abaixo da tela | Modo "tela baixa", conferido em 320×640, 375×667, 414×896, 768×1024 e 1024×768 |

## 6. O que não é coberto por testes automáticos

- A conexão real com o Supabase e o sistema publicado no Render: conferidos à mão antes da entrega (checklist do README, seção 18).
- Teste de carga (muitos acessos ao mesmo tempo): não foi feito.
- Navegadores além do Edge: os tamanhos de tela foram conferidos à mão.
