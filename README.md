# Abroad Inquiry Chat Application

## Project Overview
This repository contains a production-ready real-time chat application designed for a study abroad agency, facilitating reliable communication between students and advisors.

This `README.md` serves as a living setup guide and must be updated sequentially as each major subsystem or feature is added to the repository.

## Current Stack
- **Node.js + Express** (Backend Foundation)
- **TypeScript** (Strict Mode)
- **MySQL 8** (Containerized)
- **Docker** (Local Database Orchestration)

*(Note: Frontend and React Native configurations have not yet been initialized).*

## Folder Structure
```text
.
├── AGENTS.md                  # Project rules and conventions
├── README.md                  # This setup guide
├── backend/                   # Node.js Express backend
│   ├── database.sql           # Database schema & initialization script
│   ├── docker-compose.yml     # Docker MySQL orchestration
│   ├── package.json           # Backend dependencies
│   ├── tsconfig.json          # TypeScript configurations
│   └── src/
│       ├── app.ts             # Express app setup and middleware
│       ├── server.ts          # Server entry point
│       ├── config/            # Database and env configs
│       ├── middleware/        # Centralized error handlers
│       ├── controllers/       # (Empty) Route controllers
│       ├── repositories/      # (Empty) Raw SQL data access
│       ├── routes/            # (Empty) API routes
│       ├── services/          # (Empty) Business logic
│       ├── sockets/           # (Empty) Socket.io event handlers
│       └── utils/             # (Empty) Helper functions
└── frontend/                  # React Native frontend (Setup pending)
```

## Backend Setup
The backend currently consists of foundational scaffolding. It runs on `0.0.0.0:3000` and includes centralized error handling and security middleware (`helmet`, `cors`).

### Environment Variables
To configure the backend, create or edit the `backend/.env` file from the `.env.example` template:
```env
PORT=3000
# Use DB_HOST=localhost for host-machine local development
# Use DB_HOST=mysql for Docker documentation/config where applicable
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_NAME=abroad_inquiry
JWT_SECRET=your_jwt_secret_here
GOOGLE_APPLICATION_CREDENTIALS=../firebase-configs/firebase-service-account.json
```

### How to Run Backend
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server (auto-reloading with `ts-node-dev`):
   ```bash
   npm run dev
   ```

## Docker / MySQL Setup
The backend utilizes Docker to spin up the local MySQL 8 database environment. 

### How to Verify Database Initialization
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Start the database container:
   ```bash
   docker-compose up -d
   ```
3. To verify the initialization was successful, check the container logs for successful database seating:
   ```bash
   docker logs abroad_inquiry_db
   ```
   *The container maps `database.sql` into `/docker-entrypoint-initdb.d/init.sql` effectively spinning up tables automatically on boot.*

## Current Implementation Status
- **Hygiene**: `.gitignore` populated, Git initialized, and AI instruction artifacts placed.
- **Backend**: Foundational scaffolding initialized (`Express`, `helmet`, `cors`, centralized error handler). Database schema generated.

## Git Commit History Expectations
Commits should be strictly scoped, concise, and adhere to standard prefixes:
- `feat:` (New features or major additions)
- `fix:` (Bug fixes or rule alignment)
- `test:` (Test implementations)
- `docs:` (Updates to READMEs and rule documentation)
- `chore:` (Scaffolding, maintenance, package updates)

## Notes for Targets
- **Android S22**: Configuration guidelines and performance notes pending React Native setup.
- **iOS Simulator**: Configuration guidelines and performance notes pending React Native setup.

---

## Planned Features
* **Auth**: JWT-based authentication, user registration, and login.
* **Sockets**: Authenticated Socket.io duplex connections with memory safety and reconnect logic.
* **FCM (Firebase Cloud Messaging)**: Push notifications configured for offline delivery.
* **Frontend**: React Native CLI initialization, typed navigation, local storage (MMKV), and Gifted Chat UI.
* **Offline Queue**: Optimistic UI updates with memory-bound local queueing for reliable message delivery.
* **Tests**: Unit and integration tests for auth, message histories, and core backend logic.
