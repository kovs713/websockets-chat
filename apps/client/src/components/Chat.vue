<script setup lang="ts">
import { ref, watch } from 'vue';

interface DisplayMessage {
  type: 'message' | 'system' | 'error';
  content: string;
  timestamp?: number;
}

const props = defineProps<{
  defaultUserId?: string;
  defaultChatId?: string;
}>();

const ws = ref<WebSocket | null>(null);
const currentUser = ref(props.defaultUserId ?? '');
const chatRoom = ref(props.defaultChatId ?? '');
const message = ref('');
const joined = ref(false);
const messages = ref<DisplayMessage[]>([]);
const messagesDiv = ref<HTMLDivElement | null>(null);

function joinChat() {
  if (!currentUser.value.trim() || !chatRoom.value.trim()) return;

  ws.value = new WebSocket(`ws://${window.location.hostname}:4000/chat`);

  ws.value.onopen = () => {
    ws.value!.send(
      JSON.stringify({
        type: 'join',
        data: { userId: currentUser.value, chatId: chatRoom.value.trim() },
      }),
    );
    joined.value = true;
  };

  ws.value.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    switch (msg.type) {
      case 'message':
        messages.value.push({
          type: 'message',
          content: `[${new Date(msg.data.timestamp).toLocaleTimeString()}] ${msg.data.from}: ${msg.data.text}`,
        });
        break;
      case 'user_joined':
        messages.value.push({
          type: 'system',
          content: `${msg.userId} joined`,
        });
        break;
      case 'user_left':
        messages.value.push({
          type: 'system',
          content: `${msg.userId} left`,
        });
        break;
      case 'error':
        messages.value.push({
          type: 'error',
          content: msg.message,
        });
        break;
    }
  };

  ws.value.onclose = () => {
    messages.value.push({
      type: 'system',
      content: 'Disconnected',
    });
    joined.value = false;
  };
}

function sendMessage() {
  if (!message.value.trim() || !ws.value) return;

  ws.value.send(
    JSON.stringify({
      type: 'message',
      data: {
        from: currentUser.value,
        text: message.value.trim(),
      },
    }),
  );
  message.value = '';
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') sendMessage();
}

watch(messages, () => {
  if (messagesDiv.value) {
    messagesDiv.value.scrollTop = messagesDiv.value.scrollHeight;
  }
});
</script>

<template>
  <div class="chat-app">
    <div v-if="!joined" class="login">
      <input v-model="currentUser" placeholder="Username" />
      <input v-model="chatRoom" placeholder="Chat Room" />
      <button @click="joinChat">Join</button>
    </div>
    <div v-else class="chat">
      <div class="chat-header">{{ currentUser }}</div>
      <div ref="messagesDiv" class="messages">
        <p v-for="(msg, i) in messages" :key="i" :class="msg.type">{{ msg.content }}</p>
      </div>
      <div class="input-area">
        <input v-model="message" placeholder="Type a message..." @keydown="handleKeydown" />
        <button @click="sendMessage">Send</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-app {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
}
.chat-header {
  padding: 0.5rem 1rem;
  background: #007bff;
  color: white;
  font-weight: bold;
  text-align: center;
}
.login,
.input-area {
  display: flex;
  gap: 0.5rem;
  padding: 1rem;
}
.login {
  flex-direction: column;
}
input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}
button {
  padding: 0.5rem 1rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
button:hover {
  background: #0056b3;
}
.messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  background: #f9f9f9;
}
.messages p {
  margin: 0.25rem 0;
}
.system {
  color: #666;
  font-style: italic;
}
.error {
  color: red;
}
</style>
