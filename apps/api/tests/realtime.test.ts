import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { io as connect, type Socket } from 'socket.io-client';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { type AuthUser, signToken } from '../src/shared/auth';
import { attachRealtime, closeRealtime, realtime } from '../src/shared/realtime';

// Tempo real (tarefa A15): quem se conecta, e quem recebe cada aviso (RN16).

const superAdmin: AuthUser = { id: 1, name: 'Carla', role: 'SUPER_ADMIN', sectorId: null };
const viewerPA: AuthUser = { id: 3, name: 'Beto', role: 'VIEWER', sectorId: 1 };
const adminRX: AuthUser = { id: 4, name: 'Duda', role: 'SECTOR_ADMIN', sectorId: 2 };

let server: Server;
let url = '';
const sockets: Socket[] = [];

// Conecta como alguém e espera a conexão terminar (ou dar erro).
function open(token: string | undefined): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = connect(url, { auth: token ? { token } : {}, transports: ['websocket'], reconnection: false });
    sockets.push(socket);
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', (error) => reject(error));
  });
}

// Guarda tudo o que um socket recebe.
function inbox(socket: Socket) {
  const received: { event: string; payload: unknown }[] = [];
  socket.onAny((event, payload) => received.push({ event, payload }));
  return received;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

beforeAll(async () => {
  server = createServer();
  attachRealtime(server, ['http://localhost:5174']);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  url = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterEach(() => {
  while (sockets.length) sockets.pop()!.disconnect();
});

afterAll(async () => {
  await closeRealtime();
});

describe('tempo real (Socket.IO)', () => {
  it('sem login não conecta', async () => {
    await expect(open(undefined)).rejects.toThrow('UNAUTHORIZED');
    await expect(open('token-falso')).rejects.toThrow('UNAUTHORIZED');
  });

  it('super admin recebe os avisos de todos os setores; os outros, só do próprio (RN16)', async () => {
    const all = inbox(await open(signToken(superAdmin)));
    const pa = inbox(await open(signToken(viewerPA)));
    const rx = inbox(await open(signToken(adminRX)));

    realtime.notify('response:changed', 1);
    realtime.notify('comment:created', 2);
    await wait(200);

    expect(all).toEqual([
      { event: 'response:changed', payload: { sectorId: 1 } },
      { event: 'comment:created', payload: { sectorId: 2 } },
    ]);
    expect(pa).toEqual([{ event: 'response:changed', payload: { sectorId: 1 } }]);
    expect(rx).toEqual([{ event: 'comment:created', payload: { sectorId: 2 } }]);
  });
});
