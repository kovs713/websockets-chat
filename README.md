# websockets-chat

Simple WebSocket chat, still a WIP.

## Structure

Monorepo (pnpm workspaces):

- `apps/server` — WebSocket Backend API
- `apps/client` — Frontend
- `packages/shared` — shared types/utils

## Running

```bash
pnpm install
pnpm dev        # server + client
pnpm dev:server # server only
pnpm dev:client # client only
```

## Roadmap

- Add DB for persisting messages and users
- Auth
- Rooms, message history
- Polish into a proper chat app
