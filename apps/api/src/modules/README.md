# apps/api/src/modules

Uma pasta por assunto. Cada módulo terá suas rotas, suas regras e seus testes (formato no README da raiz, seção 7).

| Módulo | Assunto | Dono |
| --- | --- | --- |
| `auth/` | Login dos gerentes e perfis (super admin, admin de setor, visualizador) | B |
| `users/` | Cadastro dos usuários do site de gestão | B |
| `sectors/` | Cadastro dos setores (cada um com seu link e QR Code) | B |
| `surveys/` | Cadastro das pesquisas e perguntas | B |
| `schedules/` | Equipes e escala mensal (setor + data + turno) | B |
| `comments/` | Lista dos comentários anônimos e marcação de tratado | B |
| `responses/` | Rotas públicas da pesquisa e rotina de respostas abandonadas | A |
| `dashboard/` | Indicadores, TV Wall e exportação Excel | A |
