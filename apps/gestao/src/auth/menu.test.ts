import { describe, expect, it } from 'vitest';
import { menuFor, rolesFor } from './menu';

const labels = (role: Parameters<typeof menuFor>[0]) => menuFor(role).map((item) => item.label);

describe('menu por perfil (RN16, RN18)', () => {
  it('super admin vê todas as abas, inclusive o TV Wall', () => {
    expect(labels('SUPER_ADMIN')).toEqual([
      'Dashboard',
      'TV Wall',
      'Comentários',
      'Setores',
      'Usuários',
      'Pesquisas',
      'Escala',
    ]);
  });

  it('admin de setor não vê TV Wall nem Setores', () => {
    expect(labels('SECTOR_ADMIN')).toEqual(['Dashboard', 'Comentários', 'Usuários', 'Pesquisas', 'Escala']);
  });

  it('visualizador só vê as abas de leitura', () => {
    expect(labels('VIEWER')).toEqual(['Dashboard', 'Comentários', 'Escala']);
  });

  it('só o super admin pode abrir o TV Wall', () => {
    expect(rolesFor('/tv')).toEqual(['SUPER_ADMIN']);
  });

  it('rota fora do menu é um erro de programação', () => {
    expect(() => rolesFor('/nao-existe')).toThrow();
  });
});
