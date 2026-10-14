import { BrowserRouter, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';

// Rotas do site de gestão (README, seção 10). Arquivo compartilhado (AB):
// cada pessoa acrescenta as rotas das suas telas, avisando a colega antes.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
}
