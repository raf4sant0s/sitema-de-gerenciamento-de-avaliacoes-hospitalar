import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SkipLink from './SkipLink';

afterEach(cleanup);

describe('SkipLink', () => {
  it('mostra "pular" e avisa quando é tocado (RN07)', async () => {
    const onClick = vi.fn();
    render(<SkipLink onClick={onClick} />);

    await userEvent.click(screen.getByRole('button', { name: 'pular' }));

    expect(onClick).toHaveBeenCalledOnce();
  });
});
