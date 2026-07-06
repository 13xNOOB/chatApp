# Frontend Skill

## Stack
- React Native CLI
- TypeScript
- React Navigation
- Axios
- Socket.io Client
- react-native-gifted-chat
- react-native-mmkv
- NetInfo
- Firebase Messaging

## Component Rules
- Use functional components only.
- Use hooks.
- Keep screens thin.
- Move reusable logic into hooks or services.
- Keep reusable UI in components.
- Avoid unnecessary inline styles.

## State Rules
- Keep AuthContext separate from ChatContext.
- AuthContext owns login, register, logout, token, and user.
- ChatContext owns sockets, messages, queue, typing, online status, and read receipts.
- Avoid unnecessary global state.
- Memoize expensive derived values.

## Navigation
- Navigation must be typed.
- Route params must be typed.
- Never use untyped `any` route props.

## API Rules
- Use a dedicated Axios client.
- Never call `fetch` directly from screens.
- Attach JWT automatically.
- Handle loading, success, error, and unauthorized states.
- Base URL must come from config, not hardcoded localhost.

## Storage
- Use MMKV for token/session storage.
- Do not use AsyncStorage for auth tokens.

## Socket Rules
- Keep socket logic isolated.
- Authenticate socket connection using JWT.
- Clean up listeners on unmount.
- Never register duplicate listeners.
- Handle reconnects gracefully.

## Chat Rules
- Use optimistic UI.
- Use temporary client IDs.
- Replace temporary messages after server acknowledgement.
- Queue messages while offline.
- Flush queue in order after reconnect.
- Prevent duplicate sends.
- Show pending, failed, sent, delivered, and seen states where practical.

## UI Rules
- Keep UI clean and assessment-ready.
- Support different screen sizes.
- Include loading, error, empty, and offline states.
- Show user timezone and out-of-office badge.
- Show online/offline status in chat header.

## Firebase
Use existing Firebase files from:

`firebase-configs/`

Do not regenerate Firebase credentials.