# packages/schemas

Schemas de validação no código (Zod), um arquivo por tabela do banco. Descrevem os campos e as regras de cada tabela.

São usados:
- pela API, para validar o que chega e o que vai para o banco;
- pelos dois sites, para saber o formato dos dados.

Cada tabela criada em `database/migrations/` precisa ter o seu schema aqui, com os mesmos campos.
