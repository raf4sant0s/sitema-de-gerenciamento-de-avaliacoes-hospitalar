import { BrowserRouter, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import SurveyPage from './pages/SurveyPage';

// Rotas do site da pesquisa (README, seção 10).
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        {/* RN01: link do setor, ex.: /avaliacao/pronto-atendimento (um link e um QR Code por setor) */}
        <Route path="/avaliacao/:slug" element={<SurveyPage />} />
        {/* Qualquer outro endereço: tela inicial, que pede para ler o QR Code do setor */}
        <Route path="*" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
}
