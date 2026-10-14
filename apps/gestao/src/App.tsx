import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { rolesFor } from './auth/menu';
import { RequireAuth } from './auth/RequireAuth';
import AppLayout from './components/layout/AppLayout';
import UnderConstruction from './components/layout/UnderConstruction';
import CommentsPage from './pages/comentarios/CommentsPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import SchedulePage from './pages/escala/SchedulePage';
import LoginPage from './pages/login/LoginPage';
import MyPasswordPage from './pages/minha-senha/MyPasswordPage';
import SurveyDetailPage from './pages/pesquisas/SurveyDetailPage';
import SurveysPage from './pages/pesquisas/SurveysPage';
import SectorsPage from './pages/setores/SectorsPage';
import UsersPage from './pages/usuarios/UsersPage';

// Rotas do site de gestão (README, seção 10). Arquivo compartilhado (AB):
// cada pessoa troca o <UnderConstruction> da sua aba pela tela de verdade, avisando a colega antes.
// Quem pode abrir cada aba está em auth/menu.ts (RN16).
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Tudo daqui para baixo exige login e usa o menu lateral */}
          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            {/* Pessoa A */}
            <Route
              index
              element={
                <RequireAuth roles={rolesFor('/')}>
                  <DashboardPage />
                </RequireAuth>
              }
            />
            <Route
              path="tv"
              element={
                <RequireAuth roles={rolesFor('/tv')}>
                  <UnderConstruction title="TV Wall" />
                </RequireAuth>
              }
            />

            {/* Pessoa B */}
            <Route
              path="comentarios"
              element={
                <RequireAuth roles={rolesFor('/comentarios')}>
                  <CommentsPage />
                </RequireAuth>
              }
            />
            <Route
              path="setores"
              element={
                <RequireAuth roles={rolesFor('/setores')}>
                  <SectorsPage />
                </RequireAuth>
              }
            />
            <Route
              path="usuarios"
              element={
                <RequireAuth roles={rolesFor('/usuarios')}>
                  <UsersPage />
                </RequireAuth>
              }
            />
            <Route
              path="pesquisas"
              element={
                <RequireAuth roles={rolesFor('/pesquisas')}>
                  <SurveysPage />
                </RequireAuth>
              }
            />
            <Route
              path="pesquisas/:id"
              element={
                <RequireAuth roles={rolesFor('/pesquisas')}>
                  <SurveyDetailPage />
                </RequireAuth>
              }
            />
            <Route
              path="escala"
              element={
                <RequireAuth roles={rolesFor('/escala')}>
                  <SchedulePage />
                </RequireAuth>
              }
            />

            {/* Todos os perfis: trocar a própria senha (link embaixo do menu) */}
            <Route path="minha-senha" element={<MyPasswordPage />} />
          </Route>

          {/* Endereço que não existe: volta para o início */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
