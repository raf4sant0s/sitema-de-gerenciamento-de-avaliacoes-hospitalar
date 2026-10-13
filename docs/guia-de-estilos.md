# Guia de estilos

Parte dos valores iniciais do README (seção 11) e completa o que faltava: tamanhos, botões e estados. Vale para os dois sites; quando algo é só de um deles, está indicado. Os mocks do Figma seguem este guia.

Itens marcados **(proposta)** são valores novos, que não estão no README. Precisam do ok da dupla antes de entrar na seção 11.

## 1. Cores

### Base (README, seção 11)

| Nome | Hex | Uso | Contraste no fundo `#F7F9FC` |
| --- | --- | --- | --- |
| Primária | `#0B5FA5` | Botões principais, links, foco | 6,2:1 ✅ |
| Fundo | `#F7F9FC` | Fundo das páginas | — |
| Texto | `#1A2433` | Todo o texto | 14,8:1 ✅ |
| Sucesso | `#2E7D32` | Confirmações, "tratado" | 4,9:1 ✅ |
| Alerta | `#B26A00` | Avisos | 4,0:1 ⚠️ (ver abaixo) |
| Erro | `#C62828` | Mensagens de erro | 5,3:1 ✅ |

O mínimo AA para texto comum é **4,5:1** (README, seção 11).

> ⚠️ **Alerta não passa no AA como texto comum.** `#B26A00` tem 4,0:1. Enquanto a dupla não decidir, usar a cor de alerta **só em ícones e bordas**, com o texto do aviso na cor Texto. **(proposta)** Trocar por `#8A5300` (6,0:1).

### Complementares (proposta)

| Nome | Hex | Uso |
| --- | --- | --- |
| Superfície | `#FFFFFF` | Cartões, caixas de texto |
| Primária tocada | `#084A80` | Botão primário pressionado (texto branco: 9,1:1) |
| Borda | `#D0D7E2` | Bordas de cartões e campos |
| Neutro | `#5B6675` | Link "pular", textos de apoio (5,5:1 no fundo) |
| Desabilitado (fundo) | `#E3E8EF` | Botão desabilitado |
| Desabilitado (texto) | `#5B6675` | Texto do botão desabilitado (4,7:1) |

## 2. Fonte

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

## 3. Carinhas (1 a 5)

| Valor | Rótulo | Cor |
| --- | --- | --- |
| 1 | Péssimo | `#C62828` |
| 2 | Ruim | `#E65100` |
| 3 | Regular | `#F9A825` |
| 4 | Bom | `#7CB342` |
| 5 | Ótimo | `#2E7D32` |

Regras:
- **Sempre** com o rótulo em texto embaixo, nunca só a cor (README, seção 11; RN04).
- O rótulo fica na cor **Texto** (`#1A2433`), não na cor da carinha. Amarelo e verde-claro têm pouco contraste com o fundo (1,9:1 e 2,4:1).
- Pelo mesmo motivo, o contorno, os olhos e a boca da carinha são desenhados na cor **Texto**. Assim a expressão fica visível mesmo para quem não distingue as cores (proposta).
- Ordem fixa da esquerda para a direita: 1 (Péssimo) → 5 (Ótimo).
- No celular, as cinco carinhas ficam numa linha só, se couberem com a área mínima de toque. Se não couberem, ficam em coluna (proposta).

## 4. Toque e espaçamento

- **Área mínima de toque na pesquisa: 56×56 px** (README, seção 11).
- Espaço mínimo de 8 px entre dois alvos de toque (proposta).
- Espaçamentos em múltiplos de 8 px: 8, 16, 24, 32 (proposta).
- Cantos arredondados: 12 px em botões e cartões (proposta).

## 5. Botões

| Tipo | Aparência | Onde |
| --- | --- | --- |
| Primário | Fundo Primária, texto branco, altura mínima 56 px, largura total no celular | "Enviar" no comentário, "Entrar" no login |
| Secundário | Fundo Superfície, borda e texto Primária | Ações de apoio na gestão |
| Link "pular" | Sem fundo, texto Neutro, sublinhado, abaixo das carinhas | Perguntas opcionais (RN07) |

A pergunta obrigatória **não** tem "pular" (RN05, RN07).

## 6. Estados

| Estado | Botão primário | Carinha | Link "pular" |
| --- | --- | --- | --- |
| **Normal** | Fundo `#0B5FA5`, texto branco | Cor da carinha, rótulo na cor Texto | Texto Neutro, sublinhado |
| **Tocado** (pressionado) | Fundo `#084A80` | Contorno de 3 px na cor Primária e leve aumento (até 110%) | Texto na cor Texto |
| **Selecionado** | — | Contorno de 3 px na cor Primária, rótulo em negrito | — |
| **Desabilitado** | Fundo `#E3E8EF`, texto `#5B6675`, sem sombra | Não se aplica | Não se aplica |
| **Foco** (teclado) | Contorno de 3 px na cor Primária, afastado 2 px | Igual | Igual |

Todos os valores desta tabela são **(proposta)**, exceto a cor primária.

O estado nunca é mostrado só pela cor: o selecionado também tem contorno e negrito.

## 7. Tela da pesquisa (README, seção 11)

De cima para baixo:
1. Logo pequeno no topo.
2. Pergunta grande.
3. Carinhas grandes, com o rótulo.
4. "pular" pequeno embaixo (só nas opcionais).

Nunca mostrar contador, "3 de 10" ou barra de progresso (RN03).
