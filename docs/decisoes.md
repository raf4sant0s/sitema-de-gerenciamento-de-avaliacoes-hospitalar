# Decisões da dupla

As decisões abaixo estão resumidas no README (seção 4). Aqui cada uma é explicada com mais detalhe e ligada às personas ([docs/personas.md](personas.md)). Elas precisam aparecer indicadas no mock e funcionar no sistema.

## Pesquisa do paciente

### D1 · Todas as perguntas com carinhas de 1 a 5, inclusive a obrigatória

**O que é:** toda pergunta da pesquisa é respondida tocando numa de cinco carinhas: Péssimo, Ruim, Regular, Bom e Ótimo (RN04). Cada carinha tem cor e rótulo em texto, nunca só a cor (README, seção 11).

**Por quê:**
- Carinhas são entendidas por qualquer pessoa, inclusive idosos e quem tem pouca leitura.
- Usar a mesma escala em tudo evita confusão: a pessoa aprende na primeira pergunta e repete o gesto até o fim.
- Um toque por resposta deixa a pesquisa mais rápida.

**Ligação com a persona:** a Dona Cida tem pouca leitura, enxerga mal e tem medo de "apertar errado". Com carinhas grandes e o rótulo escrito embaixo, ela entende o que cada opção quer dizer sem precisar ler uma escala numérica.

**Onde aparece:** todas as telas de pergunta do site `pesquisa`.

### D2 · A pergunta obrigatória (avaliação geral) fica na última tela

**O que é:** a única pergunta obrigatória é a avaliação geral do hospital, e ela aparece sempre na última tela de perguntas (RN05). As perguntas por etapa vêm antes e podem ser puladas (RN06, RN07).

**Por quê:** o paciente primeiro relembra cada etapa (recepção, enfermagem, médico) e só depois dá a nota geral, já pensando no atendimento inteiro.

**Ligação com a persona:** a Dona Cida teve uma recepção ruim, mas um médico ótimo. Se desse a nota geral logo no começo, ela daria só pela raiva da espera. Passando antes pelas etapas, a nota final reflete a visita toda.

**Onde aparece:** a ordem das telas no site `pesquisa`. A pergunta obrigatória não tem o link "pular".

### D3 · Pesquisa 100% anônima, com comentário de texto opcional

**O que é:** nenhum dado pessoal é pedido nem guardado: sem nome, telefone, e-mail ou CPF (RN08). No final, depois da pergunta obrigatória, aparece sempre a tela de comentário, onde o paciente pode escrever um texto livre e marcar o tipo (elogio, reclamação ou sugestão), ou deixar em branco (RN11).

**Por quê:**
- Sem dados pessoais, o paciente se sente seguro para ser sincero.
- O hospital não guarda dados protegidos pela LGPD.

**Ligação com a persona:** a Dona Cida quer reclamar da espera, mas não quer se expor nem dar o telefone. Sabendo que é anônimo, ela escreve o que aconteceu. O comentário é opcional, então quem está com pressa pode só seguir.

**Onde aparece:** nenhuma tela da pesquisa pede dado pessoal; tela de comentário no final do site `pesquisa`; nenhuma tabela do banco guarda dado do paciente (README, seção 8).

### D6 · Celular via QR Code como canal principal; tablet como apoio

**O que é:** cada setor tem uma URL própria e um código curto, cada um com o seu QR Code (RN01). O paciente responde no próprio celular; um tablet no setor pode ser usado como apoio. O sistema não diferencia de onde veio a resposta (RN12).

**Por quê:**
- Custo zero para o hospital: o paciente usa o próprio celular.
- O paciente responde com calma e com privacidade, longe do balcão.

**Ligação com a persona:** a Dona Cida recebe o QR Code na saída, e a filha aponta a câmera do celular. Ela pode responder com calma, sem ninguém olhando.

**Onde aparece:** rotas `/:slug` e `/c/:code` do site `pesquisa`; telas pensadas para celular e tablet, só com toques e botões grandes (RF17).

### D7 · Salvar a cada toque

**O que é:** a resposta é criada no banco no primeiro toque em qualquer carinha, e cada toque seguinte é salvo na hora (RN09). Uma resposta parada há 30 minutos vira abandonada, mas o que foi respondido conta nos indicadores (RN10).

**Por quê:** se o paciente fechar no meio, nada se perde.

**Ligação com a persona:** a Dona Cida saiu de madrugada, cansada. Se o celular tocar ou ela guardar o aparelho no meio da pesquisa, as carinhas que já tocou ficam salvas e entram nos números do hospital.

**Onde aparece:** API pública da pesquisa (README, seção 9); no mock, indicar que não existe botão "salvar".

## Gestão

### D4 · Avaliação ligada à equipe do turno, nunca a uma pessoa; mínimo de 5 respostas para mostrar a equipe

**O que é:** cada resposta guarda o setor, a data do plantão e o turno (RN12, RN13). A escala do mês diz qual equipe estava de plantão em cada setor, dia e turno, e é assim que a resposta fica ligada a uma **equipe**, nunca a um profissional (RN14, RN15). Nos indicadores, a nota de uma equipe só aparece com **5 ou mais respostas**; abaixo disso aparece "dados insuficientes" (RN15). Ao salvar a escala, as respostas daquele dia e turno passam para a equipe cadastrada, mesmo que a escala tenha sido feita depois.

**Por quê:**
- Não responsabilizar injustamente um profissional por uma avaliação isolada.
- Uma ou duas respostas não dizem nada sobre uma equipe; com pelo menos 5, a média já começa a fazer sentido.
- A escala costuma ser cadastrada ou corrigida com atraso; sem atualizar as respostas, elas ficariam sem equipe ou com a equipe errada.

**Ligação com a persona:** a Renata quer saber o que o paciente achou do plantão dela, mas tem medo de que uma reclamação isolada pese contra um técnico ou uma enfermeira. Olhando por equipe e só com respostas suficientes, ela age onde há um padrão, sem apontar uma pessoa.

**Onde aparece:** tela **Escala** do site `gestao` (equipes e grade do mês por dia e turno); nenhuma tabela do banco liga resposta a uma pessoa (README, seção 8); indicadores por equipe do dashboard, com "dados insuficientes" abaixo de 5 respostas.

### D5 · TV Wall numa aba só do super admin, com todos os comentários sem exceção

**O que é:** o TV Wall é uma aba do site de gestão, com os dashboards e **todos** os comentários dos pacientes, sem filtro (RN18). Só o super admin vê essa aba; para os outros perfis ela nem aparece no menu, e quem tenta abrir pelo endereço recebe "Sem permissão" (RN16).

**Por quê:**
- Os comentários podem conter críticas. Deixar o TV Wall restrito evita expor problemas ao público e às equipes de outros setores.
- A direção tem a visão completa do hospital, sem filtro.

**Ligação com a persona:** a Renata não quer que as críticas dos pacientes ao Pronto Atendimento fiquem expostas para quem passa no corredor. Ela vê e trata os comentários do setor dela na tela **Comentários**; a visão de todos os setores juntos, no TV Wall, fica com a direção.

**Onde aparece:** menu lateral do site `gestao` (a aba TV Wall só existe para o super admin); proteção da rota `/tv`; rota da API do TV Wall restrita ao super admin (README, seção 9).

### D8 · Três perfis: super admin, admin de setor e visualizador designado a um setor

**O que é:** o site de gestão tem três perfis (RN16):
- **Super admin:** tudo, em todos os setores; cadastra setores e usuários, inclusive outros super admins.
- **Admin de setor:** gerencia só o seu setor (pesquisa, escala, comentários e visualizadores).
- **Visualizador:** só olha os dados do setor para o qual foi designado, sem mudar nada.

Cada pessoa troca a própria senha em "Minha senha", e ninguém desativa a si mesmo nem muda o próprio perfil.

**Por quê:**
- Cada gestor só vê e mexe no próprio setor.
- O visualizador permite mostrar os resultados a outras pessoas da equipe sem dar poder de mudar nada.

**Ligação com a persona:** a Renata é admin de setor do Pronto Atendimento. Ela cuida da pesquisa, da escala e dos comentários só do setor dela, e cadastra a enfermeira líder do noturno como visualizadora, para acompanhar os resultados sem conseguir alterar a escala ou tratar comentários.

**Onde aparece:** menu lateral do site `gestao`, que mostra só as abas de cada perfil; tela **Usuários** (o admin de setor só cadastra visualizadores do próprio setor); telas de **Escala** e **Comentários**, que viram só leitura para o visualizador; todas as rotas da API conferem o perfil e o setor (README, seção 9).
