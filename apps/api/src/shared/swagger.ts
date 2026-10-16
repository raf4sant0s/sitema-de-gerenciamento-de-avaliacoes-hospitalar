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
    components: {
      // Botão "Authorize" do Swagger: cole o token recebido no login para testar as rotas fechadas.
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        AuthUser: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Ana' },
            role: { type: 'string', enum: ['SUPER_ADMIN', 'SECTOR_ADMIN', 'VIEWER'] },
            sectorId: { type: 'integer', nullable: true, example: null },
          },
        },
      },
      // Erros que se repetem em muitas rotas (README, seção 9). Cada rota usa com:
      // 401: { $ref: '#/components/responses/Unauthorized' }
      responses: {
        BadRequest: {
          description: 'Corpo, número da rota ou filtros em formato errado (VALIDATION_ERROR)',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        Unauthorized: {
          description: 'Sem login, token inválido ou vencido (UNAUTHORIZED)',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        Forbidden: {
          description: 'O perfil não pode fazer isso, ou o setor não é o da pessoa (FORBIDDEN, RN16)',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
      },
    },
  },
  apis: [sourceFiles],
});
