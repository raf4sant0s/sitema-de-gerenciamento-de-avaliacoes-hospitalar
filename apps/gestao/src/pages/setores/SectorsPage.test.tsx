import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Sector } from '../../api/sectors';
import SectorsPage from './SectorsPage';

// Testes da tela de setores, com a API "de mentira" (fetch simulado).

const pa: Sector = {
  id: 1,
  name: 'Pronto Atendimento',
  slug: 'pronto-atendimento',
  code: 'PA7K2Q',
  active: true,
  createdAt: '2026-10-14T12:00:00.000Z',
  surveyUrl: 'http://localhost:5173/pronto-atendimento',
  shortUrl: 'http://localhost:5173/c/PA7K2Q',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(async (_url: string, options?: RequestInit) => {
    if (options?.method === 'POST') {
      const body = JSON.parse(String(options.body));
      return json(201, { ...pa, id: 2, name: body.name, slug: body.slug, code: 'NOVO22' });
    }
    if (options?.method === 'PUT') {
      return json(200, { ...pa, ...JSON.parse(String(options.body)) });
    }
    return json(200, [pa]);
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('tela de setores (B11)', () => {
  it('mostra os setores com link, código e situação', async () => {
    render(<SectorsPage />);

    const card = (await screen.findByRole('heading', { name: 'Pronto Atendimento' })).closest('li')!;
    expect(within(card).getByText('http://localhost:5173/pronto-atendimento')).toBeTruthy();
    expect(within(card).getByText('PA7K2Q')).toBeTruthy();
    expect(within(card).getByText('Ativo')).toBeTruthy();
  });

  it('o link é gerado a partir do nome enquanto a pessoa não mexe nele', async () => {
    render(<SectorsPage />);

    await userEvent.type(screen.getByLabelText('Nome do setor'), 'Internação Pediátrica');
    expect((screen.getByLabelText('Link da pesquisa') as HTMLInputElement).value).toBe('internacao-pediatrica');
  });

  it('depois de ajustado à mão, o link não acompanha mais o nome', async () => {
    render(<SectorsPage />);

    await userEvent.type(screen.getByLabelText('Nome do setor'), 'Raio');
    const slug = screen.getByLabelText('Link da pesquisa');
    await userEvent.clear(slug);
    await userEvent.type(slug, 'rx');
    await userEvent.type(screen.getByLabelText('Nome do setor'), '-X');

    expect((slug as HTMLInputElement).value).toBe('rx');
  });

  it('criar um setor manda nome e link para a API e coloca o setor na lista', async () => {
    render(<SectorsPage />);
    await screen.findByRole('heading', { name: 'Pronto Atendimento' });

    await userEvent.type(screen.getByLabelText('Nome do setor'), 'Ambulatório');
    await userEvent.click(screen.getByRole('button', { name: 'Criar setor' }));

    expect(await screen.findByRole('heading', { name: 'Ambulatório' })).toBeTruthy();
    const post = fetchMock.mock.calls.find(([, options]) => options?.method === 'POST')!;
    expect(JSON.parse(String(post[1].body))).toEqual({ name: 'Ambulatório', slug: 'ambulatorio' });
  });

  it('erro da API aparece com ícone e texto', async () => {
    fetchMock.mockImplementation(async (_url: string, options?: RequestInit) =>
      options?.method === 'POST'
        ? json(409, { error: { code: 'SLUG_TAKEN', message: 'Já existe um setor com este link. Escolha outro.' } })
        : json(200, [pa]),
    );
    render(<SectorsPage />);

    await userEvent.type(screen.getByLabelText('Nome do setor'), 'Pronto Atendimento');
    await userEvent.click(screen.getByRole('button', { name: 'Criar setor' }));

    expect((await screen.findByRole('alert')).textContent).toContain('Já existe um setor com este link');
  });

  it('desativar pede confirmação e manda só a situação (o link nunca é enviado)', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<SectorsPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Desativar' }));

    expect(window.confirm).toHaveBeenCalled();
    expect(await screen.findByText('Inativo')).toBeTruthy();
    const put = fetchMock.mock.calls.find(([, options]) => options?.method === 'PUT')!;
    expect(JSON.parse(String(put[1].body))).toEqual({ active: false });
  });

  it('se a pessoa cancelar a confirmação, nada é desativado', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<SectorsPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Desativar' }));

    expect(fetchMock.mock.calls.some(([, options]) => options?.method === 'PUT')).toBe(false);
  });
});
