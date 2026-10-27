import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { swaggerSpec } from '../src/shared/swagger';

// Confere que a documentação Swagger (/api/docs) bate com a API de verdade (tarefa B17, RNF03).
// Percorre TODAS as rotas escritas no Swagger e chama cada uma sem login.
// Sem login, nenhuma consulta chega ao banco: o teste não precisa de banco nenhum.

interface Operation {
  security?: unknown[];
  responses: Record<string, unknown>;
}
type Spec = { paths: Record<string, Record<string, Operation>>; components: Record<string, Record<string, unknown>> };
const spec = swaggerSpec as unknown as Spec;

const app = createApp();

// Troca {id}, {questionId}... por um valor de exemplo para poder chamar a rota.
const realPath = (path: string) => '/api' + path.replace(/\{code\}/, 'ABC234').replace(/\{slug\}/, 'setor-de-teste').replace(/\{\w+\}/g, '1');

const operations = Object.entries(spec.paths).flatMap(([path, methods]) =>
  Object.entries(methods).map(([method, operation]) => ({ path, method, operation })),
);
const closed = operations.filter((item) => item.operation.security);

describe('Swagger x API', () => {
  it('documenta as rotas das duas pessoas', () => {
    // Login, cadastros e comentários (B) + pesquisa pública e dashboard (A)
    for (const path of ['/auth/login', '/users', '/sectors/{id}/qrcode', '/schedules', '/comments/{id}', '/public/responses', '/public/tv']) {
      expect(spec.paths).toHaveProperty([path]);
    }
  });

  it.each(closed.map((item) => [item.method.toUpperCase(), item.path, item.operation] as const))(
    '%s %s: tem cadeado, então sem login responde 401 e o 401 está documentado',
    async (method, path, operation) => {
      const response = await request(app)[method.toLowerCase() as 'get'](realPath(path));
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(operation.responses).toHaveProperty(['401']);
    },
  );

  it('toda referência ($ref) aponta para algo que existe', () => {
    const refs = JSON.stringify(spec).match(/#\/components\/\w+\/\w+/g) ?? [];
    for (const ref of new Set(refs)) {
      const [, , kind, name] = ref.split('/');
      expect(spec.components[kind], ref).toHaveProperty([name]);
    }
  });
});
