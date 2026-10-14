// Tela provisória para as abas que ainda não foram feitas.
// Cada tarefa troca a sua rota no App.tsx pela tela de verdade
// (ex.: Dashboard na A14, TV Wall na A16, Setores na B11).
export default function UnderConstruction({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-muted">Tela em construção.</p>
    </div>
  );
}
