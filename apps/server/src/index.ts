import { ClientMessage, ServerMessage } from '@chat/shared';

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

      switch (msg.type) {
        case 'join': {
          currentUserId = msg.data.userId;

          if (typeof msg.data.userId !== 'string' || msg.data.userId.trim().length === 0) {
            socket.send(JSON.stringify({ type: 'error', message: 'Invalid user ID' } satisfies ServerMessage));
            return;
          }
          if (!/^[a-zA-Z0-9_]{3,20}$/.test(msg.data.userId)) {
            socket.send(JSON.stringify({ type: 'error', message: 'Username must be 3-20 chars (alphanumeric + underscores)' } satisfies ServerMessage));
            return;
          }
          if (typeof msg.data.chatId !== 'string' || msg.data.chatId.trim().length === 0) {
            socket.send(JSON.stringify({ type: 'error', message: 'Invalid chat room ID' } satisfies ServerMessage));
            return;
          }

          users.set(currentUserId, { socket, chatId: msg.data.chatId });

          if (!chatRooms.has(msg.data.chatId)) {
            chatRooms.set(msg.data.chatId, new Set());
          }
          chatRooms.get(msg.data.chatId)!.add(currentUserId);

          broadcastToChat(
            msg.data.chatId,
            {
              type: 'user_joined',
              userId: currentUserId,
              chatId: msg.data.chatId,
            },
            currentUserId,
          );

          break;
        }

        case 'message': {
          if (!currentUserId || !users.has(currentUserId)) {
            socket.send(
              JSON.stringify({
                type: 'error',
                message: 'Not joined to a chat',
              } satisfies ServerMessage),
            );
            return;
          }

          if (typeof msg.data.text !== 'string' || msg.data.text.trim().length === 0) {
            socket.send(JSON.stringify({ type: 'error', message: 'Message text cannot be empty' } satisfies ServerMessage));
            return;
          }

          const { chatId } = users.get(currentUserId)!;
          broadcastToChat(
            chatId,
            {
              type: 'message',
              data: { ...msg.data, chatId, timestamp: Date.now() },
            },
            currentUserId,
          );

          break;
        }
      }
    } catch (err) {
      server.log.error({ err }, 'Invalid message');
    }
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
