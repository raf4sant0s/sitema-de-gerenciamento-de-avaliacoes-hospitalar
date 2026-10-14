import ExcelJS from 'exceljs';
import type {
  DashboardFilters,
  ExportAnswerRow,
  ExportResponseRow,
} from '../../database/repositories/dashboard.repository';

// Monta a planilha do "Exportar Excel" (RN19, tarefa A17) com a biblioteca exceljs.
// Três abas: Respostas (uma linha por resposta), Perguntas (uma linha por carinha tocada) e Filtros.
// Nenhum dado pessoal (RN08). O "código" é o começo do número interno da resposta, só para
// ligar as duas abas; não identifica ninguém.

const SHIFTS = { MANHA: 'Manhã', TARDE: 'Tarde', NOITE: 'Noite' } as const;
const STATUS = { COMPLETE: 'Completa', PARTIAL: 'Em andamento', ABANDONED: 'Abandonada' } as const;
const COMMENT_TYPES = { ELOGIO: 'Elogio', RECLAMACAO: 'Reclamação', SUGESTAO: 'Sugestão' } as const;
const STEPS = { RECEPCAO: 'Recepção', TRIAGEM: 'Triagem', ENFERMAGEM: 'Enfermagem', MEDICO: 'Médico', GERAL: 'Geral' } as const;
const FACES = ['', 'Péssimo', 'Ruim', 'Regular', 'Bom', 'Ótimo'];

const code = (id: string) => id.slice(0, 8).toUpperCase();
const brDate = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : 'sem limite');

// Cabeçalho em negrito, com fundo cinza claro, fixo no topo e com filtro do Excel.
function styleHeader(sheet: ExcelJS.Worksheet) {
  const header = sheet.getRow(1);
  header.font = { bold: true };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6E6E6' } };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columnCount } };
}

export async function buildExportWorkbook(
  responses: ExportResponseRow[],
  answers: ExportAnswerRow[],
  filters: DashboardFilters & { sectorName?: string; teamName?: string },
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistema de Avaliação Anônima do Paciente · FHDOD';

  const responsesSheet = workbook.addWorksheet('Respostas');
  responsesSheet.columns = [
    { header: 'Código', key: 'code', width: 11 },
    { header: 'Início (data e hora)', key: 'startedAt', width: 19 },
    { header: 'Data do plantão', key: 'shiftDate', width: 15 },
    { header: 'Turno', key: 'shift', width: 9 },
    { header: 'Setor', key: 'sector', width: 22 },
    { header: 'Equipe', key: 'team', width: 12 },
    { header: 'Situação', key: 'status', width: 14 },
    { header: 'Nota geral (1 a 5)', key: 'overall', width: 17 },
    { header: 'Tipo do comentário', key: 'commentType', width: 18 },
    { header: 'Comentário', key: 'comment', width: 60 },
  ];
  for (const row of responses) {
    responsesSheet.addRow({
      code: code(row.id),
      startedAt: row.startedAt,
      shiftDate: row.shiftDate,
      shift: SHIFTS[row.shift],
      sector: row.sectorName,
      team: row.teamName ?? 'Sem escala',
      status: STATUS[row.status],
      overall: row.overallScore ?? '',
      commentType: row.commentType ? COMMENT_TYPES[row.commentType] : row.commentText ? 'Sem tipo' : '',
      comment: row.commentText ?? '',
    });
  }
  responsesSheet.getColumn('comment').alignment = { wrapText: true, vertical: 'top' };
  styleHeader(responsesSheet);

  const answersSheet = workbook.addWorksheet('Perguntas');
  answersSheet.columns = [
    { header: 'Código da resposta', key: 'code', width: 18 },
    { header: 'Setor', key: 'sector', width: 22 },
    { header: 'Etapa', key: 'step', width: 12 },
    { header: 'Pergunta', key: 'question', width: 60 },
    { header: 'Nota (1 a 5)', key: 'value', width: 12 },
    { header: 'Carinha', key: 'face', width: 10 },
  ];
  for (const row of answers) {
    answersSheet.addRow({
      code: code(row.responseId),
      sector: row.sectorName,
      step: STEPS[row.step],
      question: row.question,
      value: row.value,
      face: FACES[row.value],
    });
  }
  styleHeader(answersSheet);

  const filtersSheet = workbook.addWorksheet('Filtros');
  filtersSheet.columns = [
    { header: 'Filtro', key: 'name', width: 22 },
    { header: 'Valor', key: 'value', width: 40 },
  ];
  filtersSheet.addRows([
    { name: 'Período (data do plantão)', value: `${brDate(filters.from)} a ${brDate(filters.to)}` },
    { name: 'Setor', value: filters.sectorName ?? 'Todos' },
    { name: 'Turno', value: filters.shift ? SHIFTS[filters.shift] : 'Todos' },
    { name: 'Equipe', value: filters.teamName ?? 'Todas' },
    { name: 'Respostas exportadas', value: responses.length },
    {
      name: 'Gerada em',
      value: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
    },
  ]);
  styleHeader(filtersSheet);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
