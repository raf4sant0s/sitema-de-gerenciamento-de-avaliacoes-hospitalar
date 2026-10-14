import type { Role } from '@avaliacoes/schemas';

// Quem está logado no site de gestão (mesmo formato que a API devolve no login, README seção 9).
export interface AuthUser {
  id: number;
  name: string;
  role: Role;
  sectorId: number | null;
}

export interface Session {
  token: string;
  user: AuthUser;
}

// Decisão da dupla: o login fica guardado só até fechar a aba (sessionStorage).
// Assim, num computador do hospital usado por várias pessoas, fechar o navegador já "sai".
// Dentro da aba, o token vale 8 horas (regra da API).
const KEY = 'gestao.session';

export function loadSession(): Session | null {
  try {
    const saved = sessionStorage.getItem(KEY);
    return saved ? (JSON.parse(saved) as Session) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session): void {
  sessionStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession(): void {
  sessionStorage.removeItem(KEY);
}

// Nome do perfil para mostrar na tela (RN16).
export const roleLabels: Record<Role, string> = {
  SUPER_ADMIN: 'Super admin',
  SECTOR_ADMIN: 'Admin de setor',
  VIEWER: 'Visualizador',
};
