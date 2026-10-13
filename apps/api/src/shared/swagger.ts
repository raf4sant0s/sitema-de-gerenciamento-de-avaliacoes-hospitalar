import path from 'node:path';
import swaggerJsdoc from 'swagger-jsdoc';

// Gera a documentação da API (Swagger / OpenAPI) a partir dos comentários @openapi
// escritos em cima de cada rota. A página fica em /api/docs.
// Cada pessoa documenta as próprias rotas (planos: A19 e B17).

// Procura comentários em todos os arquivos .ts (desenvolvimento) e .js (depois do build).
// O replace troca "\" por "/" porque a busca de arquivos não entende as barras do Windows.
const sourceFiles = path.join(__dirname, '..', '**', '*.{ts,js}').replace(/\\/g, '/');

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API — Sistema de Avaliação Anônima do Paciente',
      version: '1.0.0',
      description:
        'API única do sistema: atende o site da pesquisa e o site de gestão. É a única parte que acessa o banco.',
    },
    servers: [{ url: '/api' }],
  },
  apis: [sourceFiles],
});
