import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startAbandonmentJob } from '../src/modules/responses/abandonment';

// A rotina em si (RN10, tarefa A12): de quanto em quanto tempo roda e o que faz quando dá erro.
// O relógio é "de mentira" (fake timers), para não precisar esperar minutos de verdade.

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('startAbandonmentJob', () => {
  it('confere assim que liga e depois a cada minuto', async () => {
    const service = { abandonInactive: vi.fn().mockResolvedValue(0) };
    const stop = startAbandonmentJob(service);

    expect(service.abandonInactive).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(service.abandonInactive).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(60_000 * 3);
    expect(service.abandonInactive).toHaveBeenCalledTimes(5);

    stop();
    await vi.advanceTimersByTimeAsync(60_000 * 5);
    expect(service.abandonInactive).toHaveBeenCalledTimes(5);
  });

  it('um erro (ex.: banco fora do ar) não derruba a API e tenta de novo no minuto seguinte', async () => {
    const service = {
      abandonInactive: vi.fn().mockRejectedValueOnce(new Error('banco fora do ar')).mockResolvedValue(2),
    };
    const stop = startAbandonmentJob(service);

    await vi.advanceTimersByTimeAsync(0);
    expect(console.error).toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(60_000);
    expect(service.abandonInactive).toHaveBeenCalledTimes(2);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('2 marcada(s) como ABANDONED'));
    stop();
  });

  it('não começa uma verificação nova enquanto a anterior não terminou', async () => {
    let finish: (value: number) => void = () => {};
    const service = { abandonInactive: vi.fn(() => new Promise<number>((resolve) => (finish = resolve))) };
    const stop = startAbandonmentJob(service);

    await vi.advanceTimersByTimeAsync(60_000 * 3); // banco "travado" por 3 minutos
    expect(service.abandonInactive).toHaveBeenCalledTimes(1);

    finish(0);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(service.abandonInactive).toHaveBeenCalledTimes(2);
    stop();
  });
});
