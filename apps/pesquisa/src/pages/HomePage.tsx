import { useState } from 'react';
import BigButton from '../components/BigButton';
import FaceScale from '../components/FaceScale';
import QuestionTitle from '../components/QuestionTitle';
import SkipLink from '../components/SkipLink';
import SurveyFrame from '../components/SurveyFrame';
import type { FaceValue } from '../components/faces';

// Página provisória (tarefa A7): mostra os componentes com DADOS DE MENTIRA.
// Nada é salvo. As telas de verdade, ligadas à API, entram na tarefa A11.
const MOCK_QUESTIONS = [
  { id: 1, step: 'Recepção', text: 'Como foi o atendimento na recepção?', required: false },
  { id: 2, step: 'Médico', text: 'Como foi o atendimento do médico?', required: false },
  { id: 3, step: 'Avaliação geral', text: 'No geral, como você avalia o atendimento do hospital hoje?', required: true },
];

export default function HomePage() {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, FaceValue>>({});

  const question = MOCK_QUESTIONS[index];

  function next() {
    setIndex((i) => i + 1);
  }

  function handleSelect(value: FaceValue) {
    setAnswers((current) => ({ ...current, [question.id]: value }));
    // Um toque por resposta: mostra o ✓ por um instante e avança sozinha (D7).
    setTimeout(next, 400);
  }

  if (!question) {
    return (
      <SurveyFrame sectorName="Pronto Atendimento">
        <h1 className="mb-4 text-[28px] leading-tight font-bold">Fim da demonstração</h1>
        <p className="mb-6 text-muted">Estes são só os componentes, com dados de exemplo. Nada foi salvo.</p>
        <BigButton
          onClick={() => {
            setAnswers({});
            setIndex(0);
          }}
        >
          Recomeçar
        </BigButton>
      </SurveyFrame>
    );
  }

  return (
    <SurveyFrame sectorName="Pronto Atendimento">
      <QuestionTitle step={question.step} text={question.text} />
      <FaceScale key={question.id} question={question.text} value={answers[question.id]} onSelect={handleSelect} />
      {/* RN05/RN07: só as opcionais têm "pular" */}
      {!question.required && <SkipLink onClick={next} />}
    </SurveyFrame>
  );
}
