# Instruções para o Claude

@README.md

O README acima é a fonte única de verdade: contexto, regras de negócio (RN), decisões (D), contratos de banco, API e rotas, divisão de tarefas e estado do projeto. Leia antes de qualquer tarefa.

## Quem você está ajudando

- Dupla de estudantes **iniciantes**, cada um no seu computador com o seu próprio Claude, trabalhando **ao mesmo tempo** no mesmo repositório.
- Descubra quem é a pessoa: leia `CLAUDE.local.md` (arquivo pessoal, fora do git). Ele deve dizer, por exemplo: `Eu sou a Pessoa A (Nome).`
- Se esse arquivo não existir, pergunte "Você é a Pessoa A (paciente + TV) ou a Pessoa B (gestão + banco)?" e ofereça criar o `CLAUDE.local.md`.

## Como trabalhar

1. **Antes de começar uma tarefa:** confira a seção 13 do README (estado do projeto), garanta `git pull` na `main` e crie uma branch para a tarefa (`feat/...`, `docs/...`).
2. **Só edite os arquivos da pessoa dona** (seção 7 do README). Arquivos marcados `AB` são compartilhados: avise a pessoa para combinar com o colega antes de alterá-los. Se uma tarefa exigir mexer na área do colega, pare e explique.
3. **Siga os contratos** (seções 3, 8, 9 e 10). Não invente nomes de campos, rotas ou eventos. Se um contrato precisar mudar, siga a seção 14: primeiro um commit `docs(contrato): ...` no README, e avise que o colega precisa saber.
4. **Explique como para iniciante:** passo a passo, o porquê de cada coisa, comandos em PowerShell (Windows), um passo de cada vez quando for algo novo. Prefira código simples e legível a soluções "espertas".
5. **Cite as regras** nos comentários e testes quando ajudar (ex.: `// RN14: madrugada pertence ao plantão da noite anterior`).
6. **Ao terminar uma tarefa:**
   - rode os testes e confira que funciona;
   - marque `[x]` na seção 13 do README;
   - sugira a mensagem de commit (a que está na seção 13);
   - lembre a pessoa de escrever 3 linhas em `docs/registro-processo.md` (o que fez, ferramenta usada, o que mudou do plano);
   - lembre de abrir o Pull Request para o colega revisar.
7. **Nunca** commite `.env`, senhas ou tokens. Senhas de exemplo vêm de variáveis de ambiente.
8. Commits e pushes só quando a pessoa pedir.

## Pontos que valem nota (não esquecer)

- Pesquisa: uma pergunta por tela, **nunca** mostrar contador/progresso, NPS 0–10 obrigatória primeiro, carinhas nas demais, "pular" discreto, salvar a cada toque.
- As decisões D1–D8 precisam estar visíveis no mock e funcionando no sistema.
- O front publicado precisa ser fiel ao mock do Figma.
- O manual usa prints do sistema publicado e linguagem para leigos.
