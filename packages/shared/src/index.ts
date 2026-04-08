export interface ChatMessage {
  from: string;
  chatId: string;
  text: string;
  timestamp: number;
}

export interface JoinChatPayload {
  userId: string;
  chatId: string;
}

export type ServerMessage =
  | { type: "message"; data: ChatMessage }
  | { type: "user_joined"; userId: string; chatId: string }
  | { type: "user_left"; userId: string; chatId: string }
  | { type: "error"; message: string };

export type ClientMessage =
  | { type: "join"; data: JoinChatPayload }
  | { type: "message"; data: { from: string; text: string } };
