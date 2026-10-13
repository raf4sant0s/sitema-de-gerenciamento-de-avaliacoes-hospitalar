# apps

As três aplicações do projeto. As duas aplicações web nunca falam direto com o banco: elas só chamam a API.

| Pasta | O que é | Quem usa |
| --- | --- | --- |
| `api/` | Back-end (Node + Express). Único que acessa o banco | Os dois sites |
| `pesquisa/` | Site do paciente: pesquisa 100% anônima | Pacientes |
| `gestao/` | Site dos gerentes: dashboards, TV Wall e cadastros | Super admin, admin de setor e visualizador |
