# Instruções para o Claude

@README.md

O README acima é a fonte única de verdade: contexto, regras de negócio (RN), decisões (D) e contratos de banco, API e telas. A divisão de tarefas e o estado do projeto ficam em `docs/plano/pessoa-a.md` e `docs/plano/pessoa-b.md`. Leia antes de qualquer tarefa.

## Quem você está ajudando

- Dupla de estudantes **iniciantes**, cada um no seu computador com o seu próprio Claude, trabalhando **ao mesmo tempo** no mesmo repositório.
- Descubra quem é a pessoa: leia `CLAUDE.local.md` (arquivo pessoal, fora do git). Ele deve dizer, por exemplo: `Eu sou a Pessoa A (Nome).`
- Se esse arquivo não existir, pergunte "Você é a Estefanie (Pessoa A: site da pesquisa + dashboard, TV Wall e Excel) ou a Rafaela (Pessoa B: banco + login + cadastros + comentários)?" e ofereça criar o `CLAUDE.local.md`.
- O banco Supabase é **um só** para as duas, inclusive no desenvolvimento: antes de rodar migrations, seeds ou apagar dados, lembre a pessoa de avisar a colega.

## Regra principal: não invente

- **Sempre pergunte quando tiver dúvida.** Não invente regras, campos, rotas, telas, textos ou comportamentos que não estejam no README ou no plano.
- Itens marcados **(a definir)** não podem ser implementados até a dupla decidir. Pergunte e, depois da resposta, atualize o README (seção 14).

## Como trabalhar

1. **Antes de começar uma tarefa:** confira no plano da pessoa se a tarefa e as suas dependências ("Depende de") já estão prontas; garanta `git pull` na `develop` e crie a branch indicada no plano, saindo da `develop`.
2. **Só edite os arquivos da pessoa dona** (README, seção 7). Arquivos marcados `AB` são compartilhados: avise a pessoa para combinar com o colega antes de alterá-los. Se uma tarefa exigir mexer na área do colega, pare e explique.
3. **Siga os contratos** (README, seções 3, 8, 9 e 10). Não invente nomes de tabelas, colunas, rotas ou eventos. Se um contrato precisar mudar, siga a seção 14: primeiro um commit `docs(contrato): ...` no README, e avise que o colega precisa saber.
4. **Banco fácil de trocar:** só a API acessa o banco; os módulos usam apenas as interfaces de `apps/api/src/database/repositories/`; só `apps/api/src/database/supabase/` conhece o Supabase. Toda tabela nova tem migration SQL em `database/migrations/` **e** schema Zod em `packages/schemas/`.
5. **Explique como para iniciante:** passo a passo, o porquê de cada coisa, comandos em PowerShell (Windows), um passo de cada vez quando for algo novo. Prefira código simples e legível a soluções "espertas".
6. **Cite as regras** nos comentários e testes quando ajudar (ex.: `// RN13: madrugada pertence ao plantão da noite anterior`).
7. **Ao terminar uma tarefa:**
   - rode os testes e confira que funciona;
   - marque `[x]` na tarefa do plano da pessoa;
   - lembre a pessoa de escrever 3 linhas em `docs/registro-processo.md` (o que fez, ferramenta usada, o que mudou do plano);
   - entregue o **passo a passo do commit** (regra 9).
8. **Nunca** coloque `.env`, senhas ou tokens no git. Senhas de exemplo vêm de variáveis de ambiente.
9. **Commits: o Claude NUNCA executa `git commit`, `git push`, merge ou qualquer comando que altere o histórico.** Quem faz é sempre a pessoa, no próprio computador, com a própria conta. O Claude **nunca** adiciona `Co-Authored-By`, "Generated with Claude" ou qualquer marca do Claude em commits, Pull Requests ou arquivos do repositório. Ao terminar cada tarefa, o Claude **sempre** entrega o passo a passo, explicando cada comando e ligando-o ao que foi feito no projeto:
   1. qual tarefa do plano foi concluída e quais regras (RN) ou decisões (D) ela atende;
   2. `git status` para conferir os arquivos alterados (listar quais são esperados);
   3. `git add <arquivos da tarefa>` (só os arquivos da pessoa dona, nunca `.env`);
   4. `git commit -m "<mensagem indicada no plano>"`;
   5. `git push -u origin <nome-da-branch>`;
   6. como abrir o Pull Request no GitHub **com destino `develop`** para o colega revisar (título e descrição sugeridos, citando a tarefa e as RN);
   7. depois do merge: `git checkout develop` e `git pull`.
   Cada comando vai num bloco separado, em PowerShell.

## Pontos que valem nota (não esquecer)

- Pesquisa: 100% anônima, uma pergunta por tela, **nunca** mostrar contador ou progresso, carinhas de 1 a 5 em todas as perguntas, a obrigatória sempre na última tela, "pular" discreto, salvar a cada toque.
- As decisões D1–D8 precisam estar visíveis no mock e funcionando no sistema.
- O front publicado precisa ser fiel ao mock do Figma.
- O manual usa prints do sistema publicado e linguagem para leigos.
