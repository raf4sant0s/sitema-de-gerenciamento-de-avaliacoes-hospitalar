# Personas

Personas são pessoas **fictícias**, montadas a partir do briefing com o cliente (FHDOD) e do problema descrito no README (seção 2). Elas guiam as decisões de tela.

- **Paciente:** Maria Aparecida, a "Dona Cida" (Pessoa A)
- **Gestão:** Renata Moreira, coordenadora de enfermagem do Pronto Atendimento (Pessoa B)

## Paciente

### Maria Aparecida, a "Dona Cida"

> "Eu só queria que alguém soubesse como foi. Fiquei três horas esperando e ninguém me explicou nada."

| | |
| --- | --- |
| **Nome fictício** | Maria Aparecida ("Dona Cida") |
| **Idade** | 63 anos |
| **Ocupação** | Aposentada (foi costureira) |
| **Escolaridade** | Ensino fundamental incompleto |
| **Familiaridade com tecnologia** | Baixa. Tem um Android simples, de tela pequena, com a letra aumentada. Usa WhatsApp e câmera; a filha ajuda com o resto. Usa óculos para perto e às vezes esquece de levar |
| **Canal preferido** | Celular, pelo QR Code entregue na saída (a filha aponta a câmera) |

#### Contexto

Levou o marido ao **Pronto Atendimento** num domingo à noite, com dor no peito. Esperou muito na recepção, achou a enfermagem rápida e o médico atencioso, mas ninguém avisou quanto tempo ia demorar. Saiu de madrugada, cansada.

#### Objetivos

- Contar que a espera foi longa e que faltou informação.
- Elogiar o médico que atendeu bem.
- Responder rápido, sem se cansar.

#### Dores

- O formulário de papel é comprido e tem letra pequena: ela desiste no meio.
- Tem medo de "apertar errado" no celular.
- Não quer dar nome nem telefone: tem receio de se expor ao reclamar.
- Fica ansiosa quando vê "pergunta 3 de 15", acha que vai demorar e larga.

#### Como o sistema atende a Dona Cida

| Necessidade | O que o sistema faz | Regra / decisão |
| --- | --- | --- |
| Enxerga mal | Fonte Atkinson Hyperlegible, texto mínimo de 18 px, área de toque de 56×56 px | Seção 11 |
| Pouca leitura | Todas as perguntas com carinhas de 1 a 5, sempre com o rótulo em texto | RN04, D1 |
| Desiste de pesquisa longa | Uma pergunta por tela, sem contador nem barra de progresso | RN02, RN03 |
| Pressa | Só a avaliação geral é obrigatória; as outras têm o "pular" discreto | RN05, RN07 |
| Medo de se expor | Pesquisa 100% anônima: nenhum dado pessoal é pedido | RN08, D3 |
| Quer contar o que aconteceu | Tela de comentário opcional no final, com tipo elogio, reclamação ou sugestão | RN11 |
| Pode fechar o celular no meio | Cada toque é salvo na hora | RN09, D7 |

#### Jornada resumida

1. Na saída, recebe o papel com o QR Code. A filha aponta a câmera e abre a pesquisa do Pronto Atendimento.
2. Responde uma etapa por tela: Recepção 😟 **Ruim**, Enfermagem 🙂 **Bom**, Médico 😄 **Ótimo**.
3. Na última tela de perguntas, dá a avaliação geral do hospital: 😐 **Regular** (D2).
4. Na tela de comentário, marca **Reclamação** e escreve sobre a espera e a falta de informação.
5. Vê o agradecimento. A resposta fica gravada com setor, data, hora e turno da noite, sem nenhum dado dela (RN08, RN12).

## Gestão

### Renata Moreira, coordenadora de enfermagem do Pronto Atendimento

> "Eu quero saber o que o paciente achou do meu plantão, mas sem jogar a culpa num funcionário por causa de uma reclamação só."

| | |
| --- | --- |
| **Nome fictício** | Renata Moreira |
| **Idade** | 46 anos |
| **Ocupação** | Enfermeira, coordenadora de enfermagem do Pronto Atendimento |
| **Perfil no sistema** | Admin de setor (`SECTOR_ADMIN`) do Pronto Atendimento |
| **Familiaridade com tecnologia** | Média. Usa todo dia o computador da sala da coordenação: e-mail, planilha do Excel e o sistema do hospital. Usa WhatsApp no celular. Não é da área de TI e se perde com termos técnicos |
| **Canal preferido** | Computador da sala da coordenação, para a escala e os comentários; o celular para uma olhada rápida durante o plantão |

#### Contexto

Coordena as equipes de enfermagem do **Pronto Atendimento**, que trabalham em três turnos (manhã, tarde e noite). Hoje recebe da Ouvidoria, de vez em quando, uma pilha de pesquisas de papel: poucas, muitas sem data, com reclamações escritas no verso e sem dizer de qual turno são. Monta a escala do mês numa planilha e passa horas tentando descobrir qual equipe estava de plantão quando um paciente reclamou.

#### Objetivos

- Saber o que os pacientes acham do setor, por turno e por equipe, para agir onde precisa.
- Responder às reclamações e registrar o que foi feito.
- Mostrar os elogios para a equipe, que hoje se perdem.
- Deixar enfermeiras líderes acompanharem os resultados, sem poderem mudar nada.

#### Dores

- O papel quase não volta: cerca de 3 respostas a cada 500 atendimentos, e quase só de quem ficou insatisfeito.
- Não sabe de qual turno nem de qual equipe é cada reclamação.
- Tem medo de que uma reclamação isolada pese injustamente contra um técnico ou uma enfermeira.
- Perde tempo passando o papel para planilhas.
- Não quer que críticas dos pacientes fiquem expostas para quem passa no corredor.

#### Como o sistema atende a Renata

| Necessidade | O que o sistema faz | Regra / decisão |
| --- | --- | --- |
| Saber de qual turno e equipe é cada resposta | Cada resposta guarda setor, data, hora e turno; a escala do mês liga a resposta à equipe de plantão. Se a escala for cadastrada com atraso, as respostas passam para a equipe certa ao salvar | RN12, RN13, RN14 |
| Não culpar um profissional por uma reclamação | A avaliação é ligada à equipe do turno, nunca a uma pessoa; a nota de uma equipe só aparece com 5 ou mais respostas | RN15, D4 |
| Responder às reclamações | Tela de comentários com filtros; para marcar como tratado, ela escreve o que foi feito, e pode reabrir | RN17 |
| Só ver e mexer no próprio setor | Perfil admin de setor: pesquisa, escala, comentários e visualizadores só do Pronto Atendimento | RN16, D8 |
| Deixar as enfermeiras líderes acompanharem | Ela mesma cadastra visualizadores do setor, que só olham, sem mudar nada | RN16, D8 |
| Críticas não expostas ao público | O TV Wall, com todos os comentários, é uma aba só do super admin (a direção) | RN18, D5 |
| Pouca familiaridade com sistemas | Telas em português simples, botões grandes, situação sempre escrita (não só cor), aviso antes de ações que não dá para desfazer | Seção 11 |
| Parar de digitar papel | As respostas chegam sozinhas e podem ser exportadas em Excel | RN19 |

#### Jornada resumida

1. Na segunda de manhã, entra no site de gestão pelo computador da coordenação, com o e-mail e a senha dela.
2. Abre **Comentários**, filtra as reclamações novas do fim de semana e lê uma sobre a espera na recepção, na noite de sábado.
3. Abre a **Escala** e confere que a Equipe B estava de plantão naquela noite. Combina uma conversa com a equipe e, em **Comentários**, marca como tratado escrevendo o que foi feito.
4. No **Dashboard**, compara a média de cada turno no mês. Uma equipe com menos de 5 respostas aparece como "dados insuficientes", e ela não tira conclusão dela (D4).
5. Em **Usuários**, cadastra a enfermeira líder do noturno como visualizadora do Pronto Atendimento, para ela acompanhar os resultados.
