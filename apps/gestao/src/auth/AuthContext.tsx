import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import * as authApi from '../api/auth';
import { type AuthUser, clearSession, loadSession, saveSession } from './session';

// Guarda quem está logado e deixa qualquer tela perguntar isso com useAuth().

interface AuthContextValue {
  user: AuthUser | null;
  // true enquanto confere, ao abrir o site, se o login salvo ainda vale
  checking: boolean;
  login(email: string, password: string): Promise<void>;
  logout(): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => loadSession()?.user ?? null);
  const [checking, setChecking] = useState(() => loadSession() !== null);

  // Ao abrir o site com um login salvo, pergunta à API se ele ainda vale
  // (o token pode ter vencido ou o usuário pode ter sido desativado).
  useEffect(() => {
    const session = loadSession();
    if (!session) return;

    authApi
      .me()
      .then((freshUser) => {
        saveSession({ token: session.token, user: freshUser });
        setUser(freshUser);
      })
      .catch(() => {
        clearSession();
        setUser(null);
      })
      .finally(() => setChecking(false));
  }, []);

  async function login(email: string, password: string) {
    const session = await authApi.login(email, password);
    saveSession(session);
    setUser(session.user);
  }

  function logout() {
    clearSession();
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, checking, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth precisa estar dentro do <AuthProvider>');
  }
  return value;
}
