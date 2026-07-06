# Prompt Rules and Project Conventions

## Purpose
This file defines the conventions the coding assistant must follow while building the assessment project.

## Product Goal
Build a polished real-time chat app for a study abroad agency where students and advisors can communicate reliably.

## Main Priorities
1. Correctness
2. Clean architecture
3. Working real-time chat
4. Good mobile UX
5. Message persistence
6. Push notifications
7. Offline resilience
8. Clear documentation

## Backend Naming
- Controllers: `authController.ts`
- Services: `authService.ts`
- Repositories: `authRepository.ts`
- Routes: `authRoutes.ts`
- Middleware: `authCheck.ts`, `errorHandler.ts`

## Frontend Naming
- Screens: `LoginScreen.tsx`
- Components: `UserCard.tsx`
- Contexts: `AuthContext.tsx`
- Hooks: `useSocket.ts`
- Services: `storage.ts`
- API modules: `authApi.ts`, `messagesApi.ts`

## API Response Format

Success:

```json
{
  "success": true,
  "data": {}
}
```
Error:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

## Message Statuses

Use these statuses:

- pending client-only
- sent
- delivered
- seen
- failed client-only

## Socket Events

## Client emits:

- send_message
- mark_seen
- typing_start
- typing_stop

## Server emits:

- message_ack
- receive_message
- message_seen
- user_online
- user_offline
- typing_start
- typing_stop

## Pagination

Messages must use cursor pagination.

Allowed:

```
WHERE id < ?
ORDER BY id DESC
LIMIT ?
```

Not allowed:

```
OFFSET
```

## Database Rules
- Use created_at.
- Use updated_at.
- Use foreign keys.
- Use indexes.
- Use parameterized SQL.
- Never use SELECT *.

## Git Commit Style

Use concise commits:

```
feat: add authentication api
fix: resolve socket reconnect issue
test: add auth integration tests
docs: update setup instructions
```

## Code Style
- Keep files focused.
- Avoid giant files.
- Avoid premature abstraction.
- Prefer explicit names.
- Avoid clever one-liners.
- Comment only non-obvious logic.

## Assessment Strategy

Because this is a 48-hour project:
- build vertical slices
- test after each subsystem
- avoid unnecessary rewrites
- keep the app runnable at all times