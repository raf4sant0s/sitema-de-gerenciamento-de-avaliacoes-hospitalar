import { describe, expect, it } from 'vitest';
import { menuFor, rolesFor } from './menu';

const labels = (role: Parameters<typeof menuFor>[0]) => menuFor(role).map((item) => item.label);

describe('menu por perfil (RN16, RN18)', () => {
  it('super admin vê todas as abas; o TV Wall não está no menu, é só um link (RN18)', () => {
    expect(labels('SUPER_ADMIN')).toEqual([
      'Dashboard',
      'Comentários',
      'Setores',
      'Usuários',
      'Pesquisas',
      'Escala',
    ]);
  });

  it('admin de setor não vê Setores nem Usuários', () => {
    expect(labels('SECTOR_ADMIN')).toEqual(['Dashboard', 'Comentários', 'Pesquisas', 'Escala']);
  });

  it('visualizador só vê as abas de leitura', () => {
    expect(labels('VIEWER')).toEqual(['Dashboard', 'Comentários', 'Escala']);
  });

  it('só o super admin abre Setores e Usuários (RN16)', () => {
    expect(rolesFor('/setores')).toEqual(['SUPER_ADMIN']);
    expect(rolesFor('/usuarios')).toEqual(['SUPER_ADMIN']);
  });

  it('rota fora do menu é um erro de programação', () => {
    expect(() => rolesFor('/nao-existe')).toThrow();
  });
});
