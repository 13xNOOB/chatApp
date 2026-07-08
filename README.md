# Abroad Inquiry Realtime Chat

A highly robust, production-ready, full-stack real-time chat application built for Abroad Inquiry.

## Project Overview

This project consists of a React Native mobile application and a Node.js/Express backend API. The core feature is a real-time 1-on-1 chat system backed by Socket.io, MySQL for persistence, and Firebase Cloud Messaging for offline push notifications. The application is strictly engineered with TypeScript, optimistic UI, offline caching, and a highly resilient offline message queue.

## Tech Stack

- **Frontend**: React Native CLI, TypeScript, React Navigation, Axios, MMKV (for offline queue & cache)
- **Backend**: Node.js, Express.js, TypeScript, Socket.io, Firebase Admin SDK (FCM)
- **Database**: MySQL 8.0, managed via Docker
- **Security**: JWT authentication, bcrypt password hashing

## Architecture Overview

The system strictly adheres to an N-Tier architecture:
- **Controllers** handle HTTP request parsing and response delivery.
- **Services** encapsulate the core business logic (e.g. `messageService`, `pushNotificationService`).
- **Repositories** manage direct SQL database queries.
- **Socket Manager** maps active users, broadcasts events, and triggers services.
- **Client App** utilizes context-based global state (`ChatContext`) to orchestrate API calls, Socket.io listeners, NetInfo offline listeners, and local storage.

## Features Delivered

### Core Assessment Requirements Coverage
| Requirement | Delivered Status | Notes |
| --- | --- | --- |
| Register/login/JWT | **Met** | Handled securely with bcrypt hashes and bearer tokens. |
| MySQL persistence | **Met** | All messages, users, and tokens persisted safely. |
| Socket.io realtime messages | **Met** | Fully integrated in `socketManager.ts`. |
| User list | **Met** | Excludes current authenticated user, tracks presence dynamically. |
| Chat history | **Met** | Chronological cursor-based pagination. |
| Online/offline presence | **Met** | Real-time mapping updated over websockets. |
| Typing indicator | **Met** | Ephemeral event with 5-second automatic timeout cleanup. |
| Android FCM | **Met** | End-to-end verified with physical S22 testing. |
| iOS Simulator support w/o APNs | **Met** | Safely disabled for simulator testing while websockets cover real-time chat. |

### Enhanced Production-Ready Goals
| Requirement | Delivered Status | Notes |
| --- | --- | --- |
| Offline queue | **Met** | Sent messages queue into MMKV when offline and seamlessly replay chronological order upon reconnect. |
| Read receipts | **Met** | `pending` -> `sent` -> `delivered` -> `seen` status mapping. |
| Unread badges | **Met** | Visible in User List, decrements accurately. |
| Timezone UX | **Met** | Dynamic local time shown in chat headers, 'Out of Office' badges in contacts. |
| Light/dark mode | **Met** | Seamless native theming built-in. |
| **GiftedChat replacement** | **Met** | *The chat UI is implemented using plain React Native components instead of GiftedChat because GiftedChat introduced native dependency instability during testing. The delivered chat functionality remains completely robust.* |

---

## 🛠 Setup & Installation

### 1. Database Schema Setup
The project utilizes Docker to spin up and auto-initialize the database.
```bash
cd backend
docker-compose up -d
```
This command maps `database.sql` and `seed.sql` to MySQL's entrypoint, automatically creating the `abroad_inquiry` schema, tables (`users`, `messages`, `device_tokens`), and secure seed users.

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
```
Ensure your `.env` contains:
```env
PORT=3000
DB_HOST=localhost # Note: Use 127.0.0.1 for local, or abroad_inquiry_db for docker bridge
DB_USER=root
DB_PASSWORD=root  # Assuming Docker default
DB_NAME=abroad_inquiry
JWT_SECRET=your_jwt_secret_here
```
Run the backend:
```bash
npm run dev
# OR for production build:
npm run build && npm start
```

### 3. Frontend Setup
```bash
cd frontend
npm install
cd ios && pod install && cd ..
```
**Environment Variables (CRITICAL):**
Copy `frontend/src/config/env.example.ts` to `frontend/src/config/env.ts`.

#### Android S22 Physical Device Testing:
You cannot use `localhost` on a physical device. Both the Android phone and your Mac must be on the same Wi-Fi.
1. Find your Mac's LAN IP: `ipconfig getifaddr en0` (e.g., `192.168.0.132`).
2. Put that IP in `frontend/src/config/env.ts`.

#### Running the App:
```bash
# Android
npm run android

# iOS Simulator
npm run ios
```

### 4. Seed Data Setup
The database automatically seeds 3 test accounts (Password for all: `password123`):
- test1@example.com
- test2@example.com
- test3@example.com

You can also use the in-app Registration screen to create fresh accounts.

### 5. Firebase/FCM Setup
For Android Push Notifications to function, you must provide Firebase credentials.
1. Place the generated `google-services.json` inside `firebase-configs/`.
2. Place the Firebase Admin SDK private key as `firebase-configs/firebase-service-account.json`. (This is safely ignored by Git to protect secrets).
3. The frontend build automatically copies `google-services.json` via a pre-build script.

**Verifying FCM manually:**
```bash
cd backend
npm run test:fcm -- --userId=1
```

---

## Technical Workflows

### Offline Queue Behavior
The app leverages `@react-native-community/netinfo`. When offline:
1. `UserListScreen` safely falls back to MMKV cached contacts and displays an offline banner.
2. Navigating into a chat fetches the cached chat history for that exact receiver.
3. Sending messages pushes payloads into a `pendingMessagesQueue` serialized in MMKV.
4. UI displays an optimistic bubble with a pending clock icon (⌚).
5. Upon network reconnection, `ChatContext` locks a flush sequence, rapidly verifying and acknowledging messages in strict chronological order.

### API Endpoints
- `POST /api/auth/register` (name, email, password, timezone)
- `POST /api/auth/login` (email, password -> returns JWT)
- `GET /api/users` (Protected, returns all non-self contacts with unread hydration)
- `GET /api/messages/:userId?cursor=` (Protected, strict cursor pagination)

### Socket Events
- `send_message`: Emits payload (requires `clientTempId`)
- `receive_message`: Delivers real-time bubbles to active chat bounds
- `message_ack`: Server responds confirming database insertion
- `typing_start` / `typing_stop`: Dynamic header triggers

---

## Known Limitations
1. **GiftedChat Removed**: Replaced with plain React Native lists to secure stability against Reanimated/Gesture Handler collisions.
2. **iOS Push Notifications**: Intentionally excluded from scope; APNs certificates were not configured. The iOS Simulator relies completely on WebSocket fallbacks.
3. **Local Dev Routing**: Running Firebase integrations locally over LAN IPs occasionally runs into Android hardware IP masking issues. Make sure the S22 is disconnected from any VPNs.

## Future Improvements
- Expand WebSocket clusters utilizing Redis adapters.
- Build extensive E2E Detox testing across the queue behaviors.
- Allow Media/Image sending mapped to AWS S3 buckets.

## Troubleshooting
- **Network Error on Login**: Ensure `DEV_MACHINE_IP` is correct in `env.ts`. Ensure phone is on the exact same Wi-Fi.
- **FCM Script failing module load**: Ensure `firebase-service-account.json` precisely matches the name and location inside the config folder.
