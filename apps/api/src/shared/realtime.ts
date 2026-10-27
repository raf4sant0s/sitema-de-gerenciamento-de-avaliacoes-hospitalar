import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { verifyToken } from './auth';

// Tempo real (README, seção 9; tarefa A15), com Socket.IO.
// O evento só AVISA que algo mudou num setor; a tela busca os dados de novo pela API.
//
//   response:changed  { sectorId }   → dashboard e TV Wall
//   comment:created   { sectorId }   → comentários
//
// Canal principal: só quem está logado se conecta (mesmo crachá/token do site de gestão).
// RN16: o super admin ouve todos os setores; admin de setor e visualizador, só o próprio.
//
// Canal "/tv": o TV Wall é público (RN18), então este canal não pede login. Ele só recebe
// response:changed, que diz apenas o número do setor, nunca dados de respostas ou comentários.

export type RealtimeEvent = 'response:changed' | 'comment:created';

export interface Notifier {
  notify(event: RealtimeEvent, sectorId: number): void;
}

// Salas: "sector:1", "sector:2"... e "all" (super admin).
const sectorRoom = (sectorId: number) => `sector:${sectorId}`;
const ALL_ROOM = 'all';
const TV_NAMESPACE = '/tv';

let io: Server | undefined;

// Liga o Socket.IO no mesmo servidor da API (chamado só no server.ts).
export function attachRealtime(server: HttpServer, corsOrigins: string[]): Server {
  io = new Server(server, { cors: { origin: corsOrigins } });

  // O site manda o token na conexão: io(url, { auth: { token } }).
  io.use((socket, next) => {
    const user = verifyToken(String(socket.handshake.auth?.token ?? ''));
    if (!user) {
      next(new Error('UNAUTHORIZED'));
      return;
    }
    socket.data.user = user;
    next();
  });

  // Canal público do TV Wall (RN18): criado já na largada, sem a checagem de login acima.
  io.of(TV_NAMESPACE);

  io.on('connection', (socket) => {
    const user = socket.data.user;
    if (user.role === 'SUPER_ADMIN') {
      socket.join(ALL_ROOM);
    } else if (user.sectorId !== null) {
      socket.join(sectorRoom(user.sectorId));
    }
  });

  return io;
}

// Quem avisa (services). Enquanto o Socket.IO não está ligado (ex.: nos testes), não faz nada.
export const realtime: Notifier = {
  notify(event, sectorId) {
    io?.to([ALL_ROOM, sectorRoom(sectorId)]).emit(event, { sectorId });
    if (event === 'response:changed') io?.of(TV_NAMESPACE).emit(event, { sectorId });
  },
};

// Desliga (usado nos testes).
export async function closeRealtime(): Promise<void> {
  await io?.close();
  io = undefined;
}
