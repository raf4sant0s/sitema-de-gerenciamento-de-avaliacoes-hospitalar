# Padrões de Git

Padrões de branches, commits e Pull Requests da dupla. Entregável da disciplina de Criação de Sites. O resumo do fluxo também está no [README](../README.md), seção 15.

## 1. Branches (GitFlow simplificado)

| Branch | Uso | Quem mexe |
| --- | --- | --- |
| `main` | Versão estável, publicada no Render | Só recebe a `develop` quando algo está pronto para publicar |
| `develop` | Onde o trabalho das duas se junta | Só recebe merges das branches de tarefa |
| `feat/…`, `fix/…`, `docs/…`, `test/…`, `chore/…` | Uma branch por tarefa, saindo da `develop` | A dona da tarefa |

Regras:

- Ninguém trabalha direto na `main` nem na `develop`.
- O nome da branch segue o plano de tarefas ([docs/plano/](plano/)): ex. `feat/dashboard-tela`, `feat/tv-wall`, `test/e2e-pesquisa`.
- Cada pessoa commita do próprio computador, com a própria conta do GitHub.

```
main ◄──── develop ◄──── feat/dashboard-tela   (Estefanie)
              ▲    ◄──── feat/comentarios      (Rafaela)
              └──────── test/e2e-pesquisa     (Estefanie)
```

## 2. Commits (Conventional Commits)

Formato: `tipo(escopo): descrição curta em português`

| Tipo | Quando | Exemplo real |
| --- | --- | --- |
| `feat` | Funcionalidade nova | `feat(dashboard): exportar excel` |
| `fix` | Correção | `fix(pesquisa): ajustes de celular e tablet` |
| `docs` | Documentação | `docs: requisitos e rastreabilidade` |
| `test` | Testes | `test(e2e): fluxo do paciente` |
| `chore` | Configuração | `chore(sites): cria projetos pesquisa e gestao` |
| `refactor` | Reorganização sem mudar o comportamento | — |
| `docs(contrato)` | Mudança de contrato (banco, API, rotas), sempre **antes** do código | `docs(contrato): regras e rotas de comentarios` |

O escopo é o módulo afetado: `auth`, `sectors`, `users`, `surveys`, `responses`, `schedules`, `comments`, `dashboard`, `pesquisa` ou `gestao`.

## 3. Revisão e Pull Requests

**Durante o desenvolvimento do sistema**, cada pessoa juntava a sua branch na `develop` com `git merge`, e a colega conferia em seguida (`git pull`, `npm install` e testes). Mudanças nos contratos eram combinadas antes, com um commit `docs(contrato)` no README.

**Fluxo de Pull Request adotado:**

1. Enviar a branch: `git push -u origin <branch>`.
2. Abrir um Pull Request da branch para a `develop`, dizendo qual tarefa ele entrega e quais regras (RN) e decisões (D) atende.
3. A colega revisa: lê as mudanças em **Files changed**, roda os testes e comenta se precisar ajustar.
4. Com a aprovação (**Approve**), a dona da tarefa faz o merge e apaga a branch.

**Checklist da revisão:**

- [ ] Os testes passam (`npm test`).
- [ ] O código segue os contratos do README (campos, rotas, erros).
- [ ] Nenhum `.env`, senha ou token no commit.
- [ ] Mensagem de commit no padrão.
- [ ] Tarefa marcada `[x]` no plano.

## 4. Outras regras do repositório

- `.gitignore` bloqueia `node_modules/`, `dist/`, relatórios de teste e todos os `.env`; só os `.env.example` (sem senhas) vão para o GitHub.
- Arquivos compartilhados (marcados `AB` no README): avisar a colega antes de mexer.
- Depois de todo `git pull`, rodar `npm install`, porque a colega pode ter instalado pacotes novos.
- Ordem do merge: `git pull` → `git merge` → `npm install`.
