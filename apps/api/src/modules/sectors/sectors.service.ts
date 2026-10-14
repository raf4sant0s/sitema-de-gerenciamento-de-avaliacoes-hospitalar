import { randomInt } from 'node:crypto';
import type { Sector } from '@avaliacoes/schemas';
import QRCode from 'qrcode';
import type { SectorsRepository } from '../../database/repositories/sectors.repository';
import { type AuthUser, assertSectorAccess } from '../../shared/auth';
import { AppError } from '../../shared/errors';

// O que a API devolve sobre um setor (README, seção 9), já com os dois links da pesquisa (RN01).
export interface SectorView {
  id: number;
  name: string;
  slug: string;
  code: string;
  active: boolean;
  createdAt: string;
  surveyUrl: string; // link pelo nome: site/<slug>
  shortUrl: string; // link pelo código: site/c/<CODIGO>
}

// Letras e números do código curto. Sem 0/O, 1/I/L, para ninguém confundir ao digitar.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

// Regras dos setores (tarefa B11). Usa só a interface do repositório, nunca o banco direto.
export class SectorsService {
  constructor(
    private readonly repository: SectorsRepository,
    private readonly surveySiteUrl: string,
    private readonly newCode: () => string = generateCode,
  ) {}

  toView(sector: Sector): SectorView {
    return {
      id: sector.id,
      name: sector.name,
      slug: sector.slug,
      code: sector.code,
      active: sector.active,
      createdAt: sector.created_at.toISOString(),
      surveyUrl: `${this.surveySiteUrl}/${sector.slug}`,
      shortUrl: `${this.surveySiteUrl}/c/${sector.code}`,
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

  // RN01: cada setor novo ganha um link (slug, único) e um código curto de 6 caracteres (único).
  async create(name: string, slug: string): Promise<SectorView> {
    if (await this.repository.findBySlug(slug)) {
      throw new AppError(409, 'SLUG_TAKEN', 'Já existe um setor com este link. Escolha outro.');
    }

    // O código é sorteado; se por acaso já existir, sorteia de novo.
    let code = this.newCode();
    while (await this.repository.findByCode(code)) {
      code = this.newCode();
    }

    return this.toView(await this.repository.create({ name, slug, code }));
  }

  // Só o nome e a situação (ativo/inativo) mudam. O link nunca muda: ele está impresso nos QR Codes.
  async update(id: number, data: { name?: string; active?: boolean }): Promise<SectorView> {
    const sector = await this.repository.update(id, data);
    if (!sector) throw this.notFound();
    return this.toView(sector);
  }

  // "Apagar" um setor = desativar (README, seção 9). As respostas antigas continuam guardadas.
  async deactivate(id: number): Promise<SectorView> {
    return this.update(id, { active: false });
  }

  // RN01: imagem PNG do QR Code com o link pelo nome (slug) ou pelo código curto (code).
  async qrCode(user: AuthUser, id: number, type: 'slug' | 'code'): Promise<{ png: Buffer; fileName: string }> {
    assertSectorAccess(user, id);
    const sector = this.toView(await this.findOrFail(id));
    const url = type === 'slug' ? sector.surveyUrl : sector.shortUrl;
    const png = await QRCode.toBuffer(url, { type: 'png', width: 600, margin: 2 });
    return { png, fileName: `qrcode-${sector.slug}${type === 'code' ? `-${sector.code}` : ''}.png` };
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
