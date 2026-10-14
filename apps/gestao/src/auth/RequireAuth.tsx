import type { Role } from '@avaliacoes/schemas';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

// Protege uma tela:
// - quem não está logado vai para /login (e volta para a tela depois de entrar);
// - quem está logado mas tem outro perfil vê o aviso "sem permissão" (RN16).
export function RequireAuth({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { user, checking } = useAuth();
  const location = useLocation();

  if (checking) {
    return <p className="p-6 text-muted">Carregando...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Sem permissão</h1>
        <p className="mt-2 text-muted">Seu perfil não tem acesso a esta tela.</p>
      </div>
    );
  }

  return <>{children}</>;
}
