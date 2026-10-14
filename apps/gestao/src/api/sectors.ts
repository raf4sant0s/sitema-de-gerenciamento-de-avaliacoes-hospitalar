import { api, downloadFile } from './client';

// Chamadas de setores para a API (README, seção 9; tarefa B11).

export interface Sector {
  id: number;
  name: string;
  slug: string;
  code: string;
  active: boolean;
  createdAt: string;
  surveyUrl: string; // link da pesquisa pelo nome
  shortUrl: string; // link da pesquisa pelo código curto
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

// RN01: imagem do QR Code com o link pelo nome (slug) ou pelo código curto (code).
export function downloadQrCode(sector: Sector, type: 'slug' | 'code'): Promise<void> {
  const fileName = `qrcode-${sector.slug}${type === 'code' ? `-${sector.code}` : ''}.png`;
  return downloadFile(`/sectors/${sector.id}/qrcode?type=${type}`, fileName);
}
