# apps/gestao

Site dos gerentes do hospital (React + Vite). Precisa de login.

Perfis:

| Perfil | O que pode |
| --- | --- |
| Super admin (admin master) | Tudo, em todos os setores. É o único que vê a aba de TV Wall com os dashboards |
| Admin de setor | Responsável pelo seu setor |
| Visualizador | Só visualiza os dados do setor que os admins designaram para ele |

| Pasta | Para que serve |
| --- | --- |
| `public/` | Arquivos estáticos |
| `src/api/` | Funções que chamam a API |
| `src/components/` | Peças visuais reutilizáveis |
| `src/pages/` | As telas (login, dashboards, TV Wall, cadastros) |
| `src/styles/` | Estilos globais |
