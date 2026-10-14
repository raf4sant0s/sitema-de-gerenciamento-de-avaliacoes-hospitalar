# Registro do processo

Vale 1 ponto no Projeto Aplicado. No fim de cada dia de trabalho, cada um adiciona uma linha no topo da tabela (mais recente primeiro).

| Data | Quem | O que fez | Ferramentas | O que mudou do plano e por quê |
| --- | --- | --- | --- | --- |
| 14/10/2026 | Estefanie | Cálculo de turno e data do plantão (tarefa A8) em apps/api/src/shared/shift.ts, com 6 testes (manhã, tarde, noite, madrugada, virada de mês/ano, hora em UTC) | Claude Code, Vitest | Nada mudou do plano; os testes também cobrem a virada de mês e de ano e o fuso de Brasília |
| 13/10/2026 | Estefanie | Componentes da pesquisa (tarefa A7): carinhas 1–5 com rótulo, botão grande, "pular" discreto e moldura da tela, com dados de mentira e 5 testes | Claude Code, Vitest, Testing Library | Carinhas uma embaixo da outra (em linha o rótulo de 18 px não cabe no celular); a tela avança sozinha após o toque |
| 13/10/2026 | Estefanie | Criou os sites pesquisa e gestao (tarefa A6): React 18 + Vite + TypeScript + Tailwind + React Router, cores e fonte do guia, client.ts e .env.example | Claude Code, npm | Cores da FHDOD no Tailwind em vez do azul do README; fonte instalada pelo pacote @fontsource para funcionar sem internet |
| 13/10/2026 | Estefanie | Guia de estilos com a identidade da FHDOD: logo e cores vermelho, branco e cinza | Claude Code | O azul do README foi trocado pelas cores do hospital; contrastes medidos de novo; seção 11 do README a atualizar com a Rafaela |
| 13/10/2026 | Estefanie | Guia de estilos em docs/guia-de-estilos.md (tarefa A3): cores, fonte, tamanhos, carinhas, botões e estados | Claude Code | Ao medir o contraste, a cor de alerta (#B26A00) deu 4,0:1, abaixo do AA; proposta de trocar por #8A5300, a decidir com a dupla |
| 13/10/2026 | Estefanie | Decisões D1, D2, D3, D6 e D7 explicadas em docs/decisoes.md (tarefa A2) | Claude Code | Cada decisão ligada à persona do paciente (Dona Cida); justificativas iguais às do README, só mais detalhadas |
| 13/10/2026 | Estefanie | Persona do paciente (Dona Cida) em docs/personas.md (tarefa A1) | Claude Code | Adaptei a persona ao README atual: carinhas 1–5, obrigatória no fim, 100% anônima |
| 13/10/2026 | Dupla | Criou o repositório, o README com contexto, regras e contratos, e o CLAUDE.md | GitHub, Claude Code | O modal de contato passou a abrir logo depois da pergunta 0–10 que o disparou (pedido do cliente no briefing), e não só no fim; foi criado um convite final para elogios |
| 02/10/2026 | Dupla | Reuniu os dois enunciados e as anotações do briefing num plano único com divisão de tarefas | Claude, Claude Docs | Pergunta obrigatória definida como NPS 0–10 (pedido do cliente) em vez de carinhas; salvar a cada resposta (D8) |
