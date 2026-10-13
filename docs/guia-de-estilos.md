# Guia de estilos

Parte dos valores iniciais do README (seção 11) e completa o que faltava: tamanhos, botões e estados. Vale para os dois sites; quando algo é só de um deles, está indicado. Os mocks do Figma seguem este guia.

Itens marcados **(proposta)** são valores novos, que não estão no README. Precisam do ok da dupla antes de entrar na seção 11.

## 1. Identidade visual da FHDOD

As cores do sistema são as do hospital: **vermelho, branco e cinza**. Elas substituem o azul que estava no README (seção 11).

### Logo

![Logo da FHDOD](img/logo-fhdod.png)

- Arquivo: [docs/img/logo-fhdod.png](img/logo-fhdod.png). É uma cópia de baixa resolução: pedir ao hospital a versão original (de preferência SVG) antes de publicar.
- Sempre sobre fundo branco, sem esticar, sem mudar a cor e sem efeitos.
- Pesquisa: logo pequeno no topo da tela (README, seção 11). Gestão: no topo do menu.

## 2. Cores

O mínimo AA para texto comum é **4,5:1** (README, seção 11). Todos os contrastes abaixo foram medidos.

### Marca

| Nome | Hex | Uso | Contraste |
| --- | --- | --- | --- |
| Vermelho FHDOD | `#DA2F37` | Cor da logo. Fundo dos botões primários, cabeçalho | Texto branco sobre ele: 4,7:1 ✅ |
| Vermelho escuro | `#B8242B` | Botão primário tocado; textos e links em vermelho | 5,8:1 no fundo ✅ · texto branco sobre ele: 6,3:1 ✅ |
| Branco | `#FFFFFF` | Cartões, caixas de texto, texto sobre vermelho | — |

> O Vermelho FHDOD **não** pode ser usado como cor de texto sobre o fundo cinza (4,3:1). Para texto vermelho, usar o Vermelho escuro.

### Cinzas (proposta)

| Nome | Hex | Uso | Contraste |
| --- | --- | --- | --- |
| Fundo | `#F5F5F5` | Fundo das páginas | — |
| Texto | `#2B2B2B` | Todo o texto | 13,0:1 no fundo ✅ |
| Cinza médio | `#5F5F5F` | Link "pular", textos de apoio, texto desabilitado | 5,9:1 no fundo ✅ |
| Cinza claro | `#E6E6E6` | Fundo do botão desabilitado | Cinza médio sobre ele: 5,1:1 ✅ |
| Borda | `#D9D9D9` | Bordas de cartões e campos | — |

### Situação

| Nome | Hex | Uso | Contraste no fundo |
| --- | --- | --- | --- |
| Sucesso | `#2E7D32` | Confirmações, "tratado" | 4,7:1 ✅ |
| Alerta | `#8A5300` (proposta) | Avisos | 5,8:1 ✅ |
| Erro | `#C62828` | Mensagens de erro | 5,2:1 ✅ |

O alerta do README (`#B26A00`) tinha 4,0:1 e não passava no AA; por isso a proposta de `#8A5300`.

> ⚠️ **Erro e marca são os dois vermelhos.** Para o paciente não confundir um botão com um erro, toda mensagem de erro tem **ícone e texto**, nunca só a cor vermelha.

## 3. Fonte

- **Família:** Atkinson Hyperlegible (feita para baixa visão), com fallback `system-ui`.
- **Pesos:** 400 (regular) e 700 (negrito).

| Elemento | Site `pesquisa` | Site `gestao` |
| --- | --- | --- |
| Texto mínimo | **18 px** | **16 px** |
| Pergunta | 28 px, negrito (proposta) | — |
| Título de página | 24 px, negrito (proposta) | 24 px, negrito (proposta) |
| Botão | 20 px, negrito (proposta) | 16 px, negrito (proposta) |
| Rótulo da carinha | 18 px | 16 px |
| Link "pular" | 18 px | — |

Entrelinha: 1,5 para textos e 1,25 para títulos (proposta).

## 4. Carinhas (1 a 5)

| Valor | Rótulo | Cor |
| --- | --- | --- |
| 1 | Péssimo | `#C62828` |
| 2 | Ruim | `#E65100` |
| 3 | Regular | `#F9A825` |
| 4 | Bom | `#7CB342` |
| 5 | Ótimo | `#2E7D32` |

Regras:
- **Sempre** com o rótulo em texto embaixo, nunca só a cor (README, seção 11; RN04).
- O rótulo fica na cor **Texto** (`#2B2B2B`), não na cor da carinha. Amarelo e verde-claro têm pouco contraste com o fundo (menos de 2,5:1).
- Pelo mesmo motivo, o contorno, os olhos e a boca da carinha são desenhados na cor **Texto**. Assim a expressão fica visível mesmo para quem não distingue as cores (proposta).
- Ordem fixa da esquerda para a direita: 1 (Péssimo) → 5 (Ótimo).
- No celular, as cinco carinhas ficam numa linha só, se couberem com a área mínima de toque. Se não couberem, ficam em coluna (proposta).

## 5. Toque e espaçamento

- **Área mínima de toque na pesquisa: 56×56 px** (README, seção 11).
- Espaço mínimo de 8 px entre dois alvos de toque (proposta).
- Espaçamentos em múltiplos de 8 px: 8, 16, 24, 32 (proposta).
- Cantos arredondados: 12 px em botões e cartões (proposta).

## 6. Botões

| Tipo | Aparência | Onde |
| --- | --- | --- |
| Primário | Fundo Vermelho FHDOD, texto branco, altura mínima 56 px, largura total no celular | "Enviar" no comentário, "Entrar" no login |
| Secundário | Fundo branco, borda e texto Vermelho escuro | Ações de apoio na gestão |
| Link "pular" | Sem fundo, texto Cinza médio, sublinhado, abaixo das carinhas | Perguntas opcionais (RN07) |

A pergunta obrigatória **não** tem "pular" (RN05, RN07).

## 7. Estados

| Estado | Botão primário | Carinha | Link "pular" |
| --- | --- | --- | --- |
| **Normal** | Fundo `#DA2F37`, texto branco | Cor da carinha, rótulo na cor Texto | Texto Cinza médio, sublinhado |
| **Tocado** (pressionado) | Fundo `#B8242B` | Contorno de 3 px na cor Texto e leve aumento (até 110%) | Texto na cor Texto |
| **Selecionado** | — | Contorno de 3 px na cor Texto, rótulo em negrito | — |
| **Desabilitado** | Fundo `#E6E6E6`, texto `#5F5F5F`, sem sombra | Não se aplica | Não se aplica |
| **Foco** (teclado) | Contorno de 3 px na cor Texto, afastado 2 px | Igual | Igual |

Todos os valores desta tabela são **(proposta)**, exceto o Vermelho FHDOD. O contorno das carinhas é cinza escuro, e não vermelho, para não se confundir com a carinha Péssimo nem com erro.

O estado nunca é mostrado só pela cor: o selecionado também tem contorno e negrito.

## 8. Tela da pesquisa (README, seção 11)

De cima para baixo:
1. Logo da FHDOD pequeno no topo, sobre faixa branca.
2. Pergunta grande.
3. Carinhas grandes, com o rótulo.
4. "pular" pequeno embaixo (só nas opcionais).

Nunca mostrar contador, "3 de 10" ou barra de progresso (RN03).
