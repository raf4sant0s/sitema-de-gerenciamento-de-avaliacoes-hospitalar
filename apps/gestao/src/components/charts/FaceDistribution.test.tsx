import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import FaceDistribution from './FaceDistribution';

// Respostas por carinha do dashboard (RN20).

afterEach(cleanup);

describe('FaceDistribution', () => {
  it('mostra da melhor para a pior: Ótimo em cima, Péssimo embaixo, com quantidade e %', () => {
    render(<FaceDistribution distribution={{ '1': 1, '2': 1, '3': 1, '4': 4, '5': 1 }} />);

    const rows = screen.getAllByRole('listitem').map((row) => row.textContent);
    expect(rows).toEqual(['Ótimo1 13%', 'Bom4 50%', 'Regular1 13%', 'Ruim1 13%', 'Péssimo1 13%']);
  });
});
