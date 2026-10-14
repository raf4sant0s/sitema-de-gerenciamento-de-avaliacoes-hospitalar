import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { menuFor } from '../../auth/menu';
import { roleLabels } from '../../auth/session';

// Moldura das telas de quem está logado: menu na lateral esquerda (decisão da dupla)
// com só as abas do perfil (RN16), e a tela aberta à direita.
// No celular, o menu fica escondido e abre pelo botão "Menu".
export default function AppLayout() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!user) return null;

  return (
    <div className="min-h-screen md:flex">
      {/* Barra do topo, só no celular */}
      <header className="flex h-16 items-center justify-between border-b-4 border-fhdod-red bg-white px-4 md:hidden">
        <img src="/logo-fhdod.png" alt="FHDOD" className="h-8" />
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-expanded={menuOpen}
          aria-controls="menu-lateral"
          className="rounded-xl border border-fhdod-red-dark px-4 py-2 font-bold text-fhdod-red-dark focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Menu
        </button>
      </header>

      <aside
        id="menu-lateral"
        className={`${menuOpen ? 'flex' : 'hidden'} flex-col border-r border-line bg-white md:flex md:min-h-screen md:w-64`}
      >
        {/* Guia de estilos: na gestão, o logo fica no topo do menu */}
        <div className="hidden h-20 items-center border-b-4 border-fhdod-red px-6 md:flex">
          <img src="/logo-fhdod.png" alt="FHDOD" className="h-10" />
        </div>

        <nav aria-label="Menu principal" className="flex-1 p-3">
          <ul className="flex flex-col gap-1">
            {menuFor(user.role).map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    [
                      'block rounded-xl px-4 py-3',
                      'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink',
                      // Aba aberta: fundo vermelho e negrito (não só a cor)
                      isActive ? 'bg-fhdod-red font-bold text-white' : 'hover:bg-page',
                    ].join(' ')
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-line p-4">
          <p className="font-bold">{user.name}</p>
          <p className="text-muted">{roleLabels[user.role]}</p>
          <NavLink
            to="/minha-senha"
            onClick={() => setMenuOpen(false)}
            className="mt-2 inline-block text-fhdod-red-dark underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Minha senha
          </NavLink>
          <button
            type="button"
            onClick={logout}
            className="mt-3 w-full rounded-xl border border-fhdod-red-dark px-4 py-2 font-bold text-fhdod-red-dark focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
