import { api, downloadFile } from './client';

// Chamadas de setores para a API (README, seção 9; tarefa B11).

export interface Sector {
  id: number;
  name: string;
  slug: string;
  active: boolean;
  createdAt: string;
  surveyUrl: string; // link da pesquisa: site/avaliacao/<slug> (RN01)
}

export function listSectors(): Promise<Sector[]> {
  return api<Sector[]>('/sectors');
}

export function createSector(name: string, slug: string): Promise<Sector> {
  return api<Sector>('/sectors', { method: 'POST', body: JSON.stringify({ name, slug }) });
}

export function updateSector(id: number, data: { name?: string; active?: boolean }): Promise<Sector> {
  return api<Sector>(`/sectors/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

// RN01: imagem do QR Code com o link da pesquisa (/avaliacao/<slug>). Um QR Code por setor.
export function downloadQrCode(sector: Sector): Promise<void> {
  return downloadFile(`/sectors/${sector.id}/qrcode`, `qrcode-${sector.slug}.png`);
}
