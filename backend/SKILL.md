# Backend Skill

## Stack
- Node.js
- TypeScript
- Express
- Socket.io
- MySQL
- mysql2/promise
- Firebase Admin SDK

## Architecture
Always use:

Controller  
→ Service  
→ Repository

Controllers:
- validate request shape
- read authenticated user
- call services
- format HTTP responses

Services:
- contain business logic
- coordinate repositories
- handle transactions when needed
- never contain raw SQL

Repositories:
- contain SQL only
- use parameterized queries
- never return unnecessary columns
- never use `SELECT *`

## Database Rules
- Use raw SQL through mysql2/promise.
- Never concatenate unsafe SQL.
- Use transactions for multi-write operations.
- Use foreign keys.
- Use indexes for frequently queried fields.
- Never use OFFSET pagination for messages.
- Use cursor pagination for chat history.

## Auth Rules
- Use JWT.
- Derive user identity from JWT only.
- Never trust user IDs from request bodies.
- Hash passwords with bcrypt.
- Never return password hashes.

## API Rules
Use consistent response format:

```ts
{
  success: boolean;
  data?: unknown;
  error?: {
    code: string;
    message: string;
  };
}
```
## Socket.io Rules
- Authenticate sockets with JWT.
- Validate every socket payload.
- Keep REST and socket logic separate.
- Clean up socket references on disconnect.
- Use acknowledgement callbacks for message sending.
- Send FCM notification only when receiver is offline.

## Error Handling
- Use centralized error middleware.
- Never leak stack traces in production responses.
- Log useful server errors.
- Never log passwords, JWTs, or Firebase private keys.

## Performance
- Avoid N+1 queries.
- Paginate large datasets.
- Clean up in-memory socket maps.
- Keep queries index-friendly.