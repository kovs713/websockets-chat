<script setup lang="ts">
import Chat from './components/Chat.vue';
</script>

<template>
  <div class="split-view">
    <Chat default-user-id="Alice" default-chat-id="room1" />
    <Chat default-user-id="Bob" default-chat-id="room1" />
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
html,
body,
#app {
  height: 100%;
}
.split-view {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  height: 100vh;
  padding: 1rem;
}
</style>
