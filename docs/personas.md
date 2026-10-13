# Personas

Personas são pessoas **fictícias**, montadas a partir do briefing com o cliente (FHDOD) e do problema descrito no README (seção 2). Elas guiam as decisões de tela.

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
