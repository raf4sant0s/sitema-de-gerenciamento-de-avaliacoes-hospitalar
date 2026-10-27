import type { Sector } from '@avaliacoes/schemas';
import QRCode from 'qrcode';
import type { SectorsRepository } from '../../database/repositories/sectors.repository';
import { type AuthUser, assertSectorAccess } from '../../shared/auth';
import { AppError } from '../../shared/errors';

// O que a API devolve sobre um setor (README, seção 9), já com o link da pesquisa (RN01).
export interface SectorView {
  id: number;
  name: string;
  slug: string;
  active: boolean;
  createdAt: string;
  surveyUrl: string; // link da pesquisa: site/avaliacao/<slug>
}

// Regras dos setores (tarefa B11). Usa só a interface do repositório, nunca o banco direto.
export class SectorsService {
  constructor(
    private readonly repository: SectorsRepository,
    private readonly surveySiteUrl: string,
  ) {}

  toView(sector: Sector): SectorView {
    return {
      id: sector.id,
      name: sector.name,
      slug: sector.slug,
      active: sector.active,
      createdAt: sector.created_at.toISOString(),
      surveyUrl: `${this.surveySiteUrl}/avaliacao/${sector.slug}`,
    };
  }

  // RN16: o super admin vê todos; admin de setor e visualizador, só o próprio.
  async list(user: AuthUser): Promise<SectorView[]> {
    if (user.role === 'SUPER_ADMIN') {
      return (await this.repository.list()).map((sector) => this.toView(sector));
    }
    const own = user.sectorId ? await this.repository.findById(user.sectorId) : null;
    return own ? [this.toView(own)] : [];
  }

  async get(user: AuthUser, id: number): Promise<SectorView> {
    assertSectorAccess(user, id);
    return this.toView(await this.findOrFail(id));
  }

  // RN01: cada setor novo ganha um link (slug) que não se repete.
  async create(name: string, slug: string): Promise<SectorView> {
    if (await this.repository.findBySlug(slug)) {
      throw new AppError(409, 'SLUG_TAKEN', 'Já existe um setor com este link. Escolha outro.');
    }
    return this.toView(await this.repository.create({ name, slug }));
  }

  // Só o nome e a situação (ativo/inativo) mudam. O link nunca muda: ele está impresso no QR Code.
  async update(id: number, data: { name?: string; active?: boolean }): Promise<SectorView> {
    const sector = await this.repository.update(id, data);
    if (!sector) throw this.notFound();
    return this.toView(sector);
  }

  // "Apagar" um setor = desativar (README, seção 9). As respostas antigas continuam guardadas.
  async deactivate(id: number): Promise<SectorView> {
    return this.update(id, { active: false });
  }

  // RN01: imagem PNG do QR Code com o link da pesquisa (/avaliacao/<slug>).
  async qrCode(user: AuthUser, id: number): Promise<{ png: Buffer; fileName: string }> {
    assertSectorAccess(user, id);
    const sector = this.toView(await this.findOrFail(id));
    const png = await QRCode.toBuffer(sector.surveyUrl, { type: 'png', width: 600, margin: 2 });
    return { png, fileName: `qrcode-${sector.slug}.png` };
  }

  private async findOrFail(id: number): Promise<Sector> {
    const sector = await this.repository.findById(id);
    if (!sector) throw this.notFound();
    return sector;
  }

  private notFound() {
    return new AppError(404, 'SECTOR_NOT_FOUND', 'Setor não encontrado');
  }
}
