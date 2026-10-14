// Cálculo do turno e da data do plantão de uma resposta (RN13).
// Turnos fixos, no horário de Brasília:
//   MANHA 07:00–12:59 · TARDE 13:00–18:59 · NOITE 19:00–06:59
// Uma resposta de madrugada (00:00–06:59) pertence ao plantão NOITE do dia anterior.

export type Shift = 'MANHA' | 'TARDE' | 'NOITE';

export interface ShiftInfo {
  shift: Shift;
  shiftDate: string; // data do plantão, no formato YYYY-MM-DD (coluna shift_date)
}

const TIME_ZONE = 'America/Sao_Paulo';

// Lê ano, mês, dia e hora da data no horário de Brasília,
// não importa em que fuso esteja o computador ou o servidor.
const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
});

function localParts(date: Date) {
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
  };
}

function toIsoDate(year: number, month: number, day: number): string {
  // Date.UTC ajusta sozinho a virada de mês e de ano (ex.: dia 0 de março = último dia de fevereiro).
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

export function getShift(date: Date): ShiftInfo {
  const { year, month, day, hour } = localParts(date);

  if (hour >= 7 && hour < 13) {
    return { shift: 'MANHA', shiftDate: toIsoDate(year, month, day) };
  }

  if (hour >= 13 && hour < 19) {
    return { shift: 'TARDE', shiftDate: toIsoDate(year, month, day) };
  }

  if (hour >= 19) {
    return { shift: 'NOITE', shiftDate: toIsoDate(year, month, day) };
  }

  // RN13: madrugada (00:00–06:59) pertence ao plantão noturno do dia anterior.
  return { shift: 'NOITE', shiftDate: toIsoDate(year, month, day - 1) };
}
