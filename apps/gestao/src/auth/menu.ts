import type { Role } from '@avaliacoes/schemas';

// Abas do site de gestão e quais perfis veem cada uma (README, seção 10; RN16, RN18).
// O menu e a proteção das rotas (App.tsx) usam esta mesma lista, para nunca ficarem diferentes.
export interface MenuItem {
  path: string;
  label: string;
  roles: Role[];
}

const ALL: Role[] = ['SUPER_ADMIN', 'SECTOR_ADMIN', 'VIEWER'];
const ADMINS: Role[] = ['SUPER_ADMIN', 'SECTOR_ADMIN'];

export const menuItems: MenuItem[] = [
  { path: '/', label: 'Dashboard', roles: ALL },
  // RN18: o TV Wall é só do super admin
  { path: '/tv', label: 'TV Wall', roles: ['SUPER_ADMIN'] },
  { path: '/comentarios', label: 'Comentários', roles: ALL },
  { path: '/setores', label: 'Setores', roles: ['SUPER_ADMIN'] },
  { path: '/usuarios', label: 'Usuários', roles: ADMINS },
  { path: '/pesquisas', label: 'Pesquisas', roles: ADMINS },
  // O visualizador vê a escala, mas não edita (a tela da escala cuida disso)
  { path: '/escala', label: 'Escala', roles: ALL },
];

// Abas que aparecem para um perfil.
export function menuFor(role: Role): MenuItem[] {
  return menuItems.filter((item) => item.roles.includes(role));
}

// Perfis que podem abrir uma rota. Telas internas (ex.: /pesquisas/3) seguem a aba "mãe" (/pesquisas).
export function rolesFor(path: string): Role[] {
  const item = menuItems.find((menu) => menu.path === path);
  if (!item) {
    throw new Error(`Rota ${path} não está no menu (auth/menu.ts)`);
  }
  return item.roles;
}
