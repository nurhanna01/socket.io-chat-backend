# Socket.IO Chat App — Backend

Backend for a real-time chat app. Built with NestJS, Socket.IO, MySQL, and Redis.

Frontend repo: https://github.com/nurhanna01/socket.io-chat-frontend

## Stack

- NestJS
- Socket.IO
- MySQL + TypeORM
- Redis
- JWT auth

## Getting Started

```bash
npm install
cp .env.example .env
# fill in DB and JWT config

npm run start:dev
```

> Set `DATABASE_SYNC=true` in `.env`, this lets TypeORM auto-sync the schema without migrations.

## Structure

```
src/auth     - register, login, JWT
src/chat     - REST endpoints + socket gateway
src/entities - users, rooms, messages
src/redis
src/config
```

## API

```
POST /auth/register
POST /auth/login
GET  /chat/messages          → conversation list (last message per room)
GET  /chat/messages/:roomId  → full message history in a room
```

Socket auth via `handshake.auth.token`. REST auth via `Authorization: Bearer <token>`.
