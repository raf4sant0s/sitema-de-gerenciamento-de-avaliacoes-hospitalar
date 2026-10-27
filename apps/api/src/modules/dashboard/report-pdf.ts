import PDFDocument from 'pdfkit';
import type { DashboardSummary } from '../../database/repositories/dashboard.repository';

// Monta o PDF do "Baixar relatório do setor" (RN23) com a biblioteca pdfkit.
// Uma página A4 para imprimir: nota geral, quantas respostas em cada carinha, e a nota por turno
// e por equipe. Nenhum dado pessoal (RN08) e nenhum comentário.

export interface ReportRow {
  label: string;
  average: number | null; // null = "dados insuficientes" (RN15, D4)
  count: number;
}

export interface SectorReportData {
  sectorName: string;
  month: string; // AAAA-MM
  summary: DashboardSummary;
  shifts: ReportRow[];
  teams: ReportRow[];
}

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// Carinhas de 1 a 5 (RN04): mesmas cores do guia de estilos, sempre com o nome escrito.
const FACES = [
  { value: 1, label: 'Péssimo', color: '#E57373' },
  { value: 2, label: 'Ruim', color: '#FFB74D' },
  { value: 3, label: 'Regular', color: '#FFD54F' },
  { value: 4, label: 'Bom', color: '#AED581' },
  { value: 5, label: 'Ótimo', color: '#81C784' },
] as const;

// Cores do guia de estilos (docs/guia-de-estilos.md): vermelho FHDOD na faixa, vermelho escuro no texto.
const RED = '#DA2F37';
const RED_DARK = '#B8242B';
const INK = '#1A2433';
const MUTED = '#555555';

// "outubro de 2026"
export function monthLabel(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return `${MONTHS[monthNumber - 1]} de ${year}`;
}

// 3,7 (1 casa decimal e vírgula, RN20). Sem nota: "—".
const formatAverage = (average: number | null) =>
  average === null ? '—' : average.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function buildSectorReportPdf(data: SectorReportData, generatedAt = new Date()): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    info: { Title: `Relatório ${data.sectorName} - ${monthLabel(data.month)}`, Author: 'FHDOD' },
  });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;

  // Cabeçalho
  doc.fillColor(RED_DARK).font('Helvetica-Bold').fontSize(20).text('FHDOD', left, 50);
  doc.fillColor(MUTED).font('Helvetica').fontSize(10).text('Fundação Hospitalar Dr. Oswaldo Diesel');
  doc.moveTo(left, doc.y + 6).lineTo(left + width, doc.y + 6).lineWidth(3).strokeColor(RED).stroke();
  doc.moveDown(1.5);

  doc.fillColor(INK).font('Helvetica-Bold').fontSize(18).text(`Relatório do setor: ${data.sectorName}`);
  doc.font('Helvetica').fontSize(12).text(`Mês: ${monthLabel(data.month)}`);
  doc.fillColor(MUTED).fontSize(10).text(
    `Gerado em ${generatedAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })}`,
  );
  doc.moveDown(1.2);

  const { summary } = data;
  if (summary.totalResponses === 0) {
    doc.fillColor(INK).fontSize(12).text('Nenhuma resposta neste mês.');
    footer(doc, left, width);
    doc.end();
    return done;
  }

  // Nota geral (RN20)
  sectionTitle(doc, 'Nota geral');
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(28).text(`${formatAverage(summary.overallAverage)} de 5`);
  doc.font('Helvetica').fontSize(11).fillColor(MUTED).text(
    `${summary.totalResponses} respostas: ${summary.complete} completas, ${summary.partial} em andamento e ${summary.abandoned} abandonadas`,
  );
  doc.moveDown(1);

  // Respostas por carinha, em barras (RN20)
  sectionTitle(doc, 'Avaliação geral: respostas por carinha');
  const counts = FACES.map((face) => summary.distribution[face.value]);
  const total = counts.reduce((sum, n) => sum + n, 0);
  const max = Math.max(1, ...counts);
  const barLeft = left + 90;
  const barWidth = width - 90 - 110;
  for (const face of [...FACES].reverse()) {
    const count = summary.distribution[face.value];
    const percent = total ? Math.round((count * 100) / total) : 0;
    const y = doc.y;
    doc.fillColor(INK).font('Helvetica').fontSize(11).text(face.label, left, y + 2, { width: 85 });
    doc.rect(barLeft, y, barWidth, 14).fill('#EEEEEE');
    if (count) doc.rect(barLeft, y, (count / max) * barWidth, 14).fill(face.color);
    doc.fillColor(INK).text(`${count} (${percent}%)`, barLeft + barWidth + 10, y + 2, { width: 100 });
    doc.y = y + 22;
  }
  doc.x = left;
  doc.moveDown(0.8);

  // Por turno e por equipe (RN15, RN22)
  table(doc, 'Por turno', 'Turno', data.shifts, left, width);
  table(doc, 'Por equipe', 'Equipe', data.teams, left, width);
  doc.fillColor(MUTED).fontSize(9).text(
    'Equipes com menos de 5 respostas mostram "Dados insuficientes": a avaliação é da equipe do plantão, nunca de uma pessoa (D4).',
    left,
    doc.y,
    { width },
  );

  footer(doc, left, width);
  doc.end();
  return done;
}

function sectionTitle(doc: PDFKit.PDFDocument, title: string) {
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(13).text(title);
  doc.moveDown(0.4);
}

// Tabela simples: nome | média | respostas.
function table(doc: PDFKit.PDFDocument, title: string, column: string, rows: ReportRow[], left: number, width: number) {
  sectionTitle(doc, title);
  if (rows.length === 0) {
    doc.fillColor(MUTED).font('Helvetica').fontSize(11).text('Sem respostas com nota geral.');
    doc.moveDown(1);
    return;
  }
  const columns = [left, left + width * 0.55, left + width * 0.8];
  const header = doc.y;
  doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(10);
  doc.text(column, columns[0], header);
  doc.text('Média', columns[1], header);
  doc.text('Respostas', columns[2], header);
  doc.moveTo(left, doc.y + 2).lineTo(left + width, doc.y + 2).lineWidth(1).strokeColor('#CCCCCC').stroke();
  doc.y += 6;

  doc.font('Helvetica').fontSize(11).fillColor(INK);
  for (const row of rows) {
    const y = doc.y;
    doc.text(row.label, columns[0], y, { width: width * 0.5 });
    doc.text(row.average === null ? 'Dados insuficientes' : formatAverage(row.average), columns[1], y);
    doc.text(String(row.count), columns[2], y);
    doc.y = y + 18;
  }
  doc.x = left;
  doc.moveDown(0.8);
}

function footer(doc: PDFKit.PDFDocument, left: number, width: number) {
  const bottom = doc.page.height - doc.page.margins.bottom - 12;
  doc.fillColor(MUTED).font('Helvetica').fontSize(8).text(
    'Pesquisa 100% anônima: este relatório não tem nenhum dado pessoal de paciente (RN08).',
    left,
    bottom,
    { width, align: 'center', lineBreak: false },
  );
}
