import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FaceScale from './FaceScale';

afterEach(cleanup);

describe('FaceScale', () => {
  it('mostra as 5 carinhas com o rótulo em texto, de Péssimo a Ótimo (RN04)', () => {
    render(<FaceScale question="Como foi a recepção?" onSelect={() => {}} />);

    const labels = screen.getAllByRole('button').map((button) => button.textContent);
    expect(labels).toEqual(['Péssimo', 'Ruim', 'Regular', 'Bom', 'Ótimo']);
  });

  it('avisa o valor de 1 a 5 da carinha tocada', async () => {
    const onSelect = vi.fn();
    render(<FaceScale question="Como foi a recepção?" onSelect={onSelect} />);

    await userEvent.click(screen.getByRole('button', { name: 'Bom' }));

    expect(onSelect).toHaveBeenCalledWith(4);
  });

  it('marca a carinha escolhida também sem depender da cor', () => {
    render(<FaceScale question="Como foi a recepção?" value={1} onSelect={() => {}} />);

    expect(screen.getByRole('button', { name: /Péssimo/ }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Ótimo' }).getAttribute('aria-pressed')).toBe('false');
  });
});
