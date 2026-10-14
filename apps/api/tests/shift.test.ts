import { describe, expect, it } from 'vitest';
import { getShift } from '../src/shared/shift';

// As datas dos testes têm o fuso de Brasília escrito (-03:00), para o teste dar o mesmo
// resultado em qualquer computador.
const at = (isoWithOffset: string) => getShift(new Date(isoWithOffset));

describe('getShift (RN13)', () => {
  it('manhã: das 07:00 às 12:59', () => {
    expect(at('2026-10-14T07:00:00-03:00')).toEqual({ shift: 'MANHA', shiftDate: '2026-10-14' });
    expect(at('2026-10-14T12:59:59-03:00')).toEqual({ shift: 'MANHA', shiftDate: '2026-10-14' });
  });

  it('tarde: das 13:00 às 18:59', () => {
    expect(at('2026-10-14T13:00:00-03:00')).toEqual({ shift: 'TARDE', shiftDate: '2026-10-14' });
    expect(at('2026-10-14T18:59:59-03:00')).toEqual({ shift: 'TARDE', shiftDate: '2026-10-14' });
  });

  it('noite: das 19:00 às 23:59 fica no próprio dia', () => {
    expect(at('2026-10-14T19:00:00-03:00')).toEqual({ shift: 'NOITE', shiftDate: '2026-10-14' });
    expect(at('2026-10-14T23:59:59-03:00')).toEqual({ shift: 'NOITE', shiftDate: '2026-10-14' });
  });

  it('madrugada: das 00:00 às 06:59 pertence ao plantão da noite anterior', () => {
    expect(at('2026-10-14T00:00:00-03:00')).toEqual({ shift: 'NOITE', shiftDate: '2026-10-13' });
    expect(at('2026-10-14T02:00:00-03:00')).toEqual({ shift: 'NOITE', shiftDate: '2026-10-13' });
    expect(at('2026-10-14T06:59:59-03:00')).toEqual({ shift: 'NOITE', shiftDate: '2026-10-13' });
  });

  it('madrugada na virada do mês e do ano volta para o último dia anterior', () => {
    expect(at('2026-11-01T03:00:00-03:00')).toEqual({ shift: 'NOITE', shiftDate: '2026-10-31' });
    expect(at('2027-01-01T01:00:00-03:00')).toEqual({ shift: 'NOITE', shiftDate: '2026-12-31' });
    expect(at('2028-03-01T05:00:00-03:00')).toEqual({ shift: 'NOITE', shiftDate: '2028-02-29' }); // ano bissexto
  });

  it('usa o horário de Brasília mesmo quando a hora chega em UTC (como no servidor)', () => {
    // 02:00 em UTC = 23:00 do dia anterior em Brasília
    expect(at('2026-10-15T02:00:00Z')).toEqual({ shift: 'NOITE', shiftDate: '2026-10-14' });
    // 10:30 em UTC = 07:30 em Brasília
    expect(at('2026-10-14T10:30:00Z')).toEqual({ shift: 'MANHA', shiftDate: '2026-10-14' });
  });
});
