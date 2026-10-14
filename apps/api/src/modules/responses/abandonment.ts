// Rotina de respostas abandonadas (RN10, tarefa A12).
// Enquanto a API estiver ligada, a cada minuto procura respostas PARTIAL paradas há mais de
// 30 minutos e muda para ABANDONED. Assim, uma resposta fica abandonada no máximo ~1 minuto
// depois de completar os 30 minutos.
// É ligada no server.ts (e não no app.ts), para os testes não ligarem a rotina sem querer.

export const ABANDONMENT_CHECK_EVERY_MS = 60_000;

interface Abandoner {
  abandonInactive(): Promise<number>;
}

// Liga a rotina. Devolve uma função que desliga.
export function startAbandonmentJob(service: Abandoner, everyMs = ABANDONMENT_CHECK_EVERY_MS): () => void {
  let running = false;

  async function check() {
    // Se a verificação anterior ainda não terminou (banco lento), não começa outra por cima.
    if (running) return;
    running = true;
    try {
      const total = await service.abandonInactive();
      if (total > 0) {
        console.log(`Respostas abandonadas (RN10): ${total} marcada(s) como ABANDONED.`);
      }
    } catch (error) {
      // Um erro (ex.: banco fora do ar) não derruba a API: tenta de novo no próximo minuto.
      console.error('Erro na rotina de respostas abandonadas:', error instanceof Error ? error.message : error);
    } finally {
      running = false;
    }
  }

  void check(); // confere uma vez assim que a API liga
  const timer = setInterval(check, everyMs);
  return () => clearInterval(timer);
}
