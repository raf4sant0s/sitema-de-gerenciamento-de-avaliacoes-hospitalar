import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import SurveyFrame from './SurveyFrame';

afterEach(cleanup);

describe('SurveyFrame', () => {
  it('mostra a logo, o setor e o aviso de pesquisa anônima, sem contador (RN03, RN08)', () => {
    render(
      <SurveyFrame sectorName="Pronto Atendimento">
        <p>conteúdo</p>
      </SurveyFrame>,
    );

    expect(screen.getByAltText('FHDOD')).toBeTruthy();
    expect(screen.getByText('Pronto Atendimento')).toBeTruthy();
    expect(screen.getByText(/Pesquisa anônima/)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/\d+ de \d+/);
  });
});
