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

### D5 · TV Wall público, num link próprio, só com gráficos em percentual

**O que é:** o TV Wall é uma página própria do site de gestão, num link separado (`/tv`), que abre **sem login** e não aparece no menu: quem precisa recebe o link (RN18). É só para visualizar. Mostra apenas **gráficos de barra em percentual**:
- avaliação geral: % de cada carinha e % de satisfeitos (Bom ou Ótimo);
- % de satisfeitos por etapa da jornada;
- % de satisfeitos por setor (com "Hospital todo") ou por turno (com um setor escolhido).

Na tela há dois filtros: período (começa nos últimos 30 dias) e setor. O TV Wall **nunca** mostra comentários, número de respostas nem equipes, e atualiza ao vivo.

**Por quê:**
- A tela fica exposta a qualquer pessoa que passa. Mostrando só percentuais, nada expõe pacientes, profissionais ou críticas.
- Sem login, o hospital pode deixar a TV ligada no link, sem ninguém precisar digitar senha num computador do corredor.
- Os comentários continuam com os gestores, na aba **Comentários**, que exige login (RN17).

**Ligação com a persona:** a Renata não quer que as críticas dos pacientes ao Pronto Atendimento fiquem expostas para quem passa no corredor. Com o TV Wall só em percentuais, ela pode deixar a TV da sala de espera no setor dela, e as críticas ela lê e trata na tela **Comentários**.

**Onde aparece:** link `/tv` do site `gestao`, fora do menu; rota pública `GET /api/public/tv`, que só devolve percentuais (README, seção 9).

**Mudança de decisão (27/10/2026):** antes, o TV Wall era uma aba só do super admin, com todos os comentários sem exceção. A dupla mudou para a versão pública e só com percentuais, para a TV poder ficar exposta sem expor ninguém.

### D8 · Três perfis: super admin, admin de setor e visualizador designado a um setor

**O que é:** o site de gestão tem três perfis (RN16):
- **Super admin:** tudo, em todos os setores; cadastra setores e é o **único** que cadastra e altera usuários, inclusive outros super admins.
- **Admin de setor:** gerencia só o seu setor (pesquisa, escala e comentários). Não mexe em usuários.
- **Visualizador:** só olha os dados do setor para o qual foi designado, sem mudar nada.

Cada pessoa troca a própria senha em "Minha senha", e ninguém desativa a si mesmo nem muda o próprio perfil.

**Por quê:**
- Cada gestor só vê e mexe no próprio setor.
- Só o super admin decide quem tem acesso ao sistema: o controle de quem entra fica num lugar só.
- O visualizador permite mostrar os resultados a outras pessoas da equipe sem dar poder de mudar nada.

**Ligação com a persona:** a Renata é admin de setor do Pronto Atendimento. Ela cuida da pesquisa, da escala e dos comentários só do setor dela. Quando quer que a enfermeira líder do noturno acompanhe os resultados, pede à direção (super admin) que a cadastre como visualizadora: ela vê tudo do setor sem conseguir alterar a escala ou tratar comentários.

**Mudança (27/10/2026):** antes, o admin de setor cadastrava visualizadores do próprio setor. A dupla decidiu que só o super admin mexe em usuários.

**Onde aparece:** menu lateral do site `gestao`, que mostra só as abas de cada perfil; tela **Usuários**, que só o super admin vê; telas de **Escala** e **Comentários**, que viram só leitura para o visualizador; todas as rotas da API conferem o perfil e o setor (README, seção 9).
