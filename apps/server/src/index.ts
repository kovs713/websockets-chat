import { ClientMessage, ServerMessage } from '@chat/shared';
import { handleMessage, handleClose } from './handlers';

import cors from '@fastify/cors';
import fastifyEnv from '@fastify/env';
import websocket from '@fastify/websocket';
import Fastify, { FastifyInstance } from 'fastify';
import { WebSocket } from 'ws';

const schema = {
  type: 'object',
  required: ['NODE_ENV', 'PORT'],
  properties: {
    NODE_ENV: { type: 'string' },
    PORT: { type: 'number', default: 4000 },
  },
};

const server: FastifyInstance = Fastify({ logger: true });

await server.register(fastifyEnv, { schema, dotenv: true, data: process.env });
await server.register(cors, { origin: true });
await server.register(websocket);

const users = new Map<string, { socket: WebSocket; chatId: string }>();
const chatRooms = new Map<string, Set<string>>();

server.get('/', async () => ({ hello: 'world' }));

server.get('/chat', { websocket: true }, (socket: WebSocket) => {
  let currentUserId: string | null = null;

  socket.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw.toString()) as ClientMessage;
      currentUserId = handleMessage(msg, socket, currentUserId, users, chatRooms, server, broadcastToChat);
    } catch (err) {
      server.log.error({ err }, 'Invalid message');
    }
  });

  socket.on('close', () => {
    handleClose(currentUserId, users, chatRooms, broadcastToChat);
  });
});

  socket.on('close', () => {
    if (currentUserId && users.has(currentUserId)) {
      const { chatId } = users.get(currentUserId)!;
      chatRooms.get(chatId)?.delete(currentUserId);
      users.delete(currentUserId);

      broadcastToChat(chatId, {
        type: 'user_left',
        userId: currentUserId,
        chatId,
      });
    }
  });
});

function broadcastToChat(chatId: string, msg: ServerMessage, excludeUserId?: string) {
  const members = chatRooms.get(chatId);
  if (!members) return;

  const payload = JSON.stringify(msg);
  for (const userId of members) {
    if (userId === excludeUserId) continue;
    const user = users.get(userId);
    if (user?.socket.readyState === WebSocket.OPEN) {
      user.socket.send(payload);
    }
  }
}

await server.ready();

try {
  await server.listen({ port: server.config.PORT });
  server.log.info(`Server running on port ${server.config.PORT}`);
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
