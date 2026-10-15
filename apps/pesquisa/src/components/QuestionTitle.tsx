interface QuestionTitleProps {
  step: string; // nome da etapa da jornada (RN06), por exemplo "Recepção"
  text: string;
}

// Etapa e pergunta. Mostra só o nome da etapa, nunca "pergunta 3 de 10" (RN03).
export default function QuestionTitle({ step, text }: QuestionTitleProps) {
  return (
    <>
      <p className="mb-2 font-bold text-fhdod-red-dark short:mb-1">{step}</p>
      <h1 className="mb-5 text-[28px] leading-tight font-bold short:mb-3 short:text-[24px]">{text}</h1>
    </>
  );
}
