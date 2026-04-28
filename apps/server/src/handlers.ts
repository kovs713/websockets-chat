import { ClientMessage, ServerMessage } from '@chat/shared';
import { WebSocket } from 'ws';
import Fastify from 'fastify';

type UserMap = Map<string, { socket: WebSocket; chatId: string }>;
type ChatRoomMap = Map<string, Set<string>>;

export function handleMessage(
  msg: ClientMessage,
  socket: WebSocket,
  currentUserId: string | null,
  users: UserMap,
  chatRooms: ChatRoomMap,
  server: Fastify.FastifyInstance,
  broadcastToChat: (chatId: string, msg: ServerMessage, excludeUserId?: string) => void
): string | null {
  switch (msg.type) {
    case 'join': {
      if (typeof msg.data.userId !== 'string' || msg.data.userId.trim().length === 0) {
        socket.send(JSON.stringify({ type: 'error', message: 'Invalid user ID' } satisfies ServerMessage));
        return null;
      }
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(msg.data.userId)) {
        socket.send(JSON.stringify({ type: 'error', message: 'Username must be 3-20 chars (alphanumeric + underscores)' } satisfies ServerMessage));
        return null;
      }
      if (typeof msg.data.chatId !== 'string' || msg.data.chatId.trim().length === 0) {
        socket.send(JSON.stringify({ type: 'error', message: 'Invalid chat room ID' } satisfies ServerMessage));
        return null;
      }

      const userId = msg.data.userId;
      users.set(userId, { socket, chatId: msg.data.chatId });

      if (!chatRooms.has(msg.data.chatId)) {
        chatRooms.set(msg.data.chatId, new Set());
      }
      chatRooms.get(msg.data.chatId)!.add(userId);

      broadcastToChat(
        msg.data.chatId,
        {
          type: 'user_joined',
          userId,
          chatId: msg.data.chatId,
        },
        userId,
      );

      return userId;
    }

    case 'message': {
      if (!currentUserId || !users.has(currentUserId)) {
        socket.send(
          JSON.stringify({
            type: 'error',
            message: 'Not joined to a chat',
          } satisfies ServerMessage),
        );
        return currentUserId;
      }

      if (typeof msg.data.text !== 'string' || msg.data.text.trim().length === 0) {
        socket.send(JSON.stringify({ type: 'error', message: 'Message text cannot be empty' } satisfies ServerMessage));
        return currentUserId;
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

      return currentUserId;
    }
  }
}

export function handleClose(
  currentUserId: string | null,
  users: UserMap,
  chatRooms: ChatRoomMap,
  broadcastToChat: (chatId: string, msg: ServerMessage, excludeUserId?: string) => void
) {
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
}
