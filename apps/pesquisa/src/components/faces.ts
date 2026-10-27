// As cinco carinhas da pesquisa (RN04): valor de 1 a 5, rótulo em texto e cor.
// As cores vêm do guia de estilos (docs/guia-de-estilos.md, seção 4).
export type FaceValue = 1 | 2 | 3 | 4 | 5;

export interface FaceOption {
  value: FaceValue;
  label: string;
  color: string;
  mouth: string; // desenho da boca no SVG (viewBox 0 0 64 64)
}

export const FACES: FaceOption[] = [
  { value: 1, label: 'Péssimo', color: '#E57373', mouth: 'M20 48 Q32 36 44 48' },
  { value: 2, label: 'Ruim', color: '#FFB74D', mouth: 'M21 46 Q32 41 43 46' },
  { value: 3, label: 'Regular', color: '#FFD54F', mouth: 'M21 44 L43 44' },
  { value: 4, label: 'Bom', color: '#AED581', mouth: 'M21 41 Q32 49 43 41' },
  { value: 5, label: 'Ótimo', color: '#81C784', mouth: 'M19 39 Q32 54 45 39' },
];
