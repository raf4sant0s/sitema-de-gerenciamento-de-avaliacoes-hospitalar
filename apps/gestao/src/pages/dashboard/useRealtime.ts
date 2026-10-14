import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { loadSession } from '../../auth/session';

// Tempo real no site de gestão (tarefa A15). Usado pelo dashboard e, depois, pelo TV Wall (A16).
// A API só AVISA que algo mudou num setor; quem ouve busca os dados de novo.
//   response:changed { sectorId }  ·  comment:created { sectorId }
// O endereço vem do .env (VITE_SOCKET_URL) e a conexão usa o mesmo token do login.

export type RealtimeEvent = 'response:changed' | 'comment:created';

// Liga o tempo real enquanto a tela estiver aberta e chama onChange a cada aviso.
// Devolve true enquanto está conectado (para mostrar "Ao vivo").
export function useRealtime(events: RealtimeEvent[], onChange: (event: RealtimeEvent, sectorId: number) => void): boolean {
  const [connected, setConnected] = useState(false);
  // Guarda sempre a versão mais nova da função, sem precisar reconectar quando ela muda.
  const handler = useRef(onChange);
  handler.current = onChange;
  const eventList = events.join(',');

  useEffect(() => {
    const token = loadSession()?.token;
    const url = import.meta.env.VITE_SOCKET_URL;
    if (!token || !url) return;

    const socket = io(url, { auth: { token } });
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    for (const event of eventList.split(',') as RealtimeEvent[]) {
      socket.on(event, (payload: { sectorId: number }) => handler.current(event, payload.sectorId));
    }

    return () => {
      socket.disconnect();
      setConnected(false);
    };
  }, [eventList]);

  return connected;
}
