# API Specification

## Project

Real-time chat application for a study abroad agency connecting students and advisors.

This document defines the contract between the backend, frontend, socket layer, tests, and documentation.

Do not change API routes, socket event names, request payloads, or response payloads without updating this file in the same commit.

---

# Global API Response Format

## Success Response

```json
{
  "success": true,
  "data": {}
}
```

## Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message"
  }
}
```

---

# Authentication

## Register

### Endpoint

```http
POST /api/auth/register
```

### Request Body

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "123456",
  "timezone": "Asia/Dhaka"
}
```

### Success Response

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "timezone": "Asia/Dhaka",
      "createdAt": "2026-07-07T10:00:00.000Z"
    }
  }
}
```

### Validation Rules

* `name` is required.
* `email` is required and must be unique.
* `password` is required.
* `timezone` is required and must be a valid IANA timezone.
* Password must be stored as `password_hash`.
* Password hash must never be returned.

---

## Login

### Endpoint

```http
POST /api/auth/login
```

### Request Body

```json
{
  "email": "john@example.com",
  "password": "123456",
  "deviceToken": "optional-fcm-token",
  "platform": "android"
}
```

### Success Response

```json
{
  "success": true,
  "data": {
    "token": "jwt-token",
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "timezone": "Asia/Dhaka"
    }
  }
}
```

### Notes

* `deviceToken` is optional.
* `platform` is optional unless `deviceToken` is provided.
* Supported platform values: `android`, `ios`.
* Android FCM is required for this assessment.
* iOS Simulator push notifications are intentionally excluded.

---

## Logout

### Endpoint

```http
POST /api/auth/logout
```

### Headers

```http
Authorization: Bearer jwt-token
```

### Request Body

```json
{
  "deviceToken": "optional-fcm-token"
}
```

### Success Response

```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

### Notes

* Client must clear local session state.
* If `deviceToken` is provided, backend should remove it from `device_tokens`.

---

# Users

## Get User Directory

### Endpoint

```http
GET /api/users
```

### Headers

```http
Authorization: Bearer jwt-token
```

### Success Response

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 2,
        "name": "Jane Advisor",
        "email": "jane@example.com",
        "timezone": "America/New_York"
      }
    ]
  }
}
```

### Rules

* Authenticated route.
* Must exclude the requesting user.
* Must never return password hashes.

---

# Messages

## Get Chat History

### Endpoint

```http
GET /api/messages/:userId
```

### Headers

```http
Authorization: Bearer jwt-token
```

### Query Params

```http
?cursor=123&limit=20
```

### Rules

* `cursor` is optional.
* `limit` defaults to `20`.
* Do not use SQL `OFFSET`.
* If no cursor is provided, return the latest messages.
* If cursor is provided, return older messages where `id < cursor`.
* Response should be chronological for UI rendering.

### Success Response

```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": 101,
        "senderId": 1,
        "receiverId": 2,
        "message": "Hello",
        "status": "sent",
        "createdAt": "2026-07-07T10:00:00.000Z"
      }
    ],
    "pagination": {
      "nextCursor": 101,
      "hasMore": true,
      "limit": 20
    }
  }
}
```

---

# Message Statuses

## Database Statuses

```text
sent
delivered
seen
```

## Client-Only Statuses

```text
pending
failed
```

## Status Meaning

* `pending`: created locally before server acknowledgement.
* `sent`: saved successfully in database.
* `delivered`: received by recipient device/socket.
* `seen`: viewed by recipient.
* `failed`: failed to send from client.

---

# Socket Authentication

Client must connect using JWT in the socket auth payload.

```ts
io(SOCKET_URL, {
  auth: {
    token: "jwt-token"
  }
});
```

Unauthenticated socket connections must be rejected.

---

# Socket Events

## Client Emits: `send_message`

### Payload

```json
{
  "clientTempId": "temp-uuid",
  "receiverId": 2,
  "message": "Hello"
}
```

### Server Behavior

* Validate payload.
* Derive sender ID from socket auth.
* Save message to database.
* Acknowledge sender with saved message.
* Emit `receive_message` to receiver if online.
* Send FCM notification if receiver is offline.

---

## Server Emits: `message_ack`

### Payload

```json
{
  "clientTempId": "temp-uuid",
  "message": {
    "id": 101,
    "senderId": 1,
    "receiverId": 2,
    "message": "Hello",
    "status": "sent",
    "createdAt": "2026-07-07T10:00:00.000Z"
  }
}
```

---

## Server Emits: `receive_message`

### Payload

```json
{
  "message": {
    "id": 101,
    "senderId": 1,
    "receiverId": 2,
    "message": "Hello",
    "status": "sent",
    "createdAt": "2026-07-07T10:00:00.000Z"
  }
}
```

---

## Client Emits: `mark_seen`

### Payload

```json
{
  "messageIds": [101, 102, 103]
}
```

### Server Behavior

* Only update messages received by the authenticated user.
* Update status to `seen`.
* Notify original sender if online.

---

## Server Emits: `message_seen`

### Payload

```json
{
  "messageIds": [101, 102, 103],
  "seenBy": 2
}
```

---

## Client Emits: `typing_start`

### Payload

```json
{
  "receiverId": 2
}
```

---

## Client Emits: `typing_stop`

### Payload

```json
{
  "receiverId": 2
}
```

---

## Server Emits: `typing_start`

### Payload

```json
{
  "userId": 1
}
```

---

## Server Emits: `typing_stop`

### Payload

```json
{
  "userId": 1
}
```

---

## Server Emits: `user_online`

### Payload

```json
{
  "userId": 1
}
```

---

## Server Emits: `user_offline`

### Payload

```json
{
  "userId": 1
}
```

---

# Database Contract

## users

```text
id
name
email
password_hash
timezone
created_at
updated_at
```

## messages

```text
id
sender_id
receiver_id
message
status
created_at
updated_at
```

## device_tokens

```text
id
user_id
token
platform
created_at
updated_at
```

---

# Pagination Standard

Allowed pattern:

```sql
WHERE id < ?
ORDER BY id DESC
LIMIT ?
```

Forbidden pattern:

```sql
OFFSET
```

---

# Firebase / FCM Scope

## Required

* Android FCM token retrieval.
* Android device token registration during login.
* Backend Firebase Admin SDK notification sending.
* Offline-user push notification behavior.

## Excluded

* Paid Apple Developer setup.
* APNs certificate/key setup.
* Physical iPhone push notification testing.

## iOS Simulator Rule

The iOS Simulator must not crash if FCM is unavailable. It should be usable for UI and API testing only.
