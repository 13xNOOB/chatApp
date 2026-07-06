# Abroad Inquiry Chat Application

## 1. Project Overview
This repository contains a production-ready real-time chat application designed for a study abroad agency, facilitating reliable communication between students and advisors.

This `README.md` serves as a living setup guide and reflects the **current state** of the project.

## 2. Current Stack
- **Node.js + Express** (Backend API & Services)
- **TypeScript** (Strict Mode for strong typing)
- **React Native** (Mobile Frontend)
- **MySQL 8** (Containerized Persistence Layer)
- **Docker** (Local Database Orchestration)
- **Jest & Supertest** (Test Framework)

## 3. Folder Structure
```text
.
├── AGENTS.md                  # Project rules and conventions
├── API_SPEC.md                # Shared API data contract
├── README.md                  # This living setup guide
├── backend/                   # Node.js Express backend
│   ├── database.sql           # Database schema & initialization script
│   ├── docker-compose.yml     # Docker MySQL orchestration
│   ├── package.json           # Backend dependencies and scripts
│   ├── tsconfig.json          # TypeScript configurations
│   ├── jest.config.js         # Jest test configuration
│   └── src/
│       ├── __tests__/         # Automated test suites
│       ├── config/            # Database and env configs
│       ├── controllers/       # HTTP request handlers and validation
│       ├── middleware/        # Centralized auth & error handlers
│       ├── repositories/      # Raw SQL data access layer
│       ├── routes/            # API routing wiring
│       ├── services/          # Business logic and coordination
│       ├── sockets/           # (Empty) Socket.io event handlers
│       ├── utils/             # (Empty) Helper functions
│       ├── app.ts             # Express app setup and middleware
       └── server.ts          # Server entry point
└── frontend/                  # React Native frontend
    ├── android/               # Android native project files
    ├── ios/                   # iOS native project files
    ├── src/
    │   ├── api/               # Axios clients and endpoints
    │   ├── components/        # Reusable UI components
    │   ├── config/            # Env and config settings
    │   ├── context/           # Auth and global state
    │   ├── navigation/        # React Navigation stack
    │   ├── screens/           # Auth and App UI screens
    │   ├── services/          # MMKV storage and logic
    │   ├── types/             # TypeScript interfaces
    │   └── utils/             # Helper functions (e.g., Firebase stubs)
    └── package.json           # Frontend dependencies
```

## 4. Backend Setup
The backend runs on `0.0.0.0:3000` and is strictly structured using the Controller → Service → Repository pattern. Security middleware (`helmet`, `cors`) and rate limiting on authentication routes are enforced.

## 5. Docker / MySQL Setup
The backend utilizes Docker to spin up the local MySQL 8 database environment. The initialization script (`database.sql`) automatically provisions tables on first boot.

> [!NOTE]
> The MySQL container binds to host port `3307` instead of `3306` to avoid conflicts with any local native MySQL instances running on the Mac Mini.

### How to Verify Database Initialization
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Start the database container:
   ```bash
   docker-compose up -d
   ```
3. To verify the initialization was successful, check the container logs:
   ```bash
   docker logs abroad_inquiry_db
   ```

## 6. Environment Variables
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

## 7. How to Run the Backend
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies (if needed):
   ```bash
   npm install
   ```
3. Run the development server (auto-reloading with `ts-node-dev`):
   ```bash
   npm run dev
   ```

## 8. Frontend Setup & Run Instructions

### Mac Mini LAN IP Setup
To run the app on a physical device, the frontend must point to your Mac Mini's local network IP.
1. Find your Mac Mini's LAN IP by running: `ipconfig getifaddr en0`
2. Open `frontend/src/config/env.ts` and replace `REPLACE_WITH_MAC_MINI_LAN_IP` with your actual IP.
3. Ensure both the Mac Mini and your Samsung S22 are connected to the same Wi-Fi network.

### Install Dependencies
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```

### Run on Android (Samsung Galaxy S22)
> [!IMPORTANT]
> Android is the primary target for full-feature push notifications.
1. Connect your S22 via USB and ensure USB Debugging is enabled.
2. Run the Android build:
   ```bash
   npm run android
   ```
*(Note: A script automatically safely copies `google-services.json` into the android directory prior to building, if present).*

### Run on iOS Simulator
> [!NOTE]
> The iOS Simulator is configured exclusively for UI and API testing. APNs and physical Apple Developer setups are intentionally skipped.
1. Install CocoaPods:
   ```bash
   cd ios && bundle install && bundle exec pod install && cd ..
   ```
2. Run the iOS build:
   ```bash
   npm run ios
   ```

## 9. How to Run TypeScript Build
To statically analyze the project and compile the TypeScript code to JavaScript:
```bash
cd backend
npm run build
```

## 9. How to Run Tests
To run the automated test suite:
```bash
cd backend
npx jest
```

## 11. Current Implemented Features
- **Frontend Foundation**: React Native CLI setup with React Navigation.
- **MMKV Storage**: High-performance local storage for JWT tokens.
- **Auth Flow**: Login and Registration screens with seamless context switching and API integration.
- **Backend Foundation**: Express setup with robust error handling and security headers.
- **Database Schema**: Optimized schema definitions for `users`, `messages`, and `device_tokens`.
- **Docker MySQL**: Containerized local environment orchestrating the schema.
- **Auth Features**: Endpoints for Register, Login, and Logout matching the API spec.
- **JWT Auth Middleware**: Token generation and request validation.
- **Protected User Directory**: Secure route explicitly excluding the querying user.
- **Device Token Storage**: Automatically upserts device push tokens upon login.
- **Mocked Persistence Test Strategy**: Isolated testing of business logic boundaries.
- **Authenticated Socket.io Setup**: Real-time duplex channels secured via JWT socket payloads. Multiple concurrent connections per user are supported natively.
- **Online User Tracking**: Real-time broadcast map maintaining `user_online` and `user_offline` statuses based on aggregate socket count.
- **Message History Endpoint**: Protected REST endpoint (`GET /api/messages/:userId`).
- **Cursor Pagination**: High-performance pagination leveraging `id < cursor` rather than sluggish `OFFSET`.
- **Android FCM Backend Push Service**: Automated notifications triggered when an offline user receives a chat. *(Note: Requires a real Android device and correctly configured google-services.json to verify end-to-end delivery).*
- **Artillery Load Test**: Socket.io load simulations available in `backend/load-test.yml` (requires a valid JWT token via environment variable).

## 12. Planned Next Features
- **Chat UI**: Implement the real `react-native-gifted-chat` UI inside the ChatScreen.
- **Offline Queue**: Reliable local data synchronization on reconnect.

## 13. Testing Note
The current automated tests purposefully **mock the database persistence layer** (`mysql2/promise` execution). This isolated approach ensures blazing-fast execution times, preventing environment bottlenecks and maximizing rapid feedback during this assessment cycle. Full Docker-backed DB integration tests can be seamlessly integrated at a later stage if deeper I/O validation is required.
