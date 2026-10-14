import { BrowserRouter, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import SurveyPage from './pages/SurveyPage';

// Rotas do site da pesquisa (README, seção 10).
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        {/* RN01: código curto de 6 caracteres, ex.: /c/PA7K2Q */}
        <Route path="/c/:code" element={<SurveyPage />} />
        {/* RN01: link do setor, ex.: /pronto-atendimento */}
        <Route path="/:slug" element={<SurveyPage />} />
      </Routes>
    </BrowserRouter>
  );
}
