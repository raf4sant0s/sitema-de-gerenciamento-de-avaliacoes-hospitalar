import { BrowserRouter, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';

// Rotas do site da pesquisa (README, seção 10).
// As rotas /:slug e /c/:code entram na tarefa A11.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
}
