# Real-Time Architecture & Tooling Blueprint

This document details the underlying mechanics, communication frameworks, and protocols powering the real-time student-advisor communication system.

## 1. Socket.io Architecture (Duplex Connection Flow)

The real-time layer operates via persistent TCP sockets established using **Socket.io**. Unlike raw WebSockets, Socket.io provides automatic reconnection fallback, connection multiplexing, and built-in heartbeats.

[Client Interface] <--- Bi-Directional Event Loop ---> [Node.js Server Process]
|                                                       |
(State Memory)                                       (Connection Store Map)

MMKV Local Store                                    - Active Memory Map:

Pending Message Queue                                 { userId: socketId }

### Memory Defense Protocol
To achieve optimal scalability on an 8GB VPS, the Node.js runtime must maintain strict control over garbage collection references:
* **Connection Lifecycle:** When a socket connection authenticates, its reference is mapped into a volatile JS object (`activeUsers[userId] = socket.id`).
* **Connection Purging:** Upon a `disconnect` or connection timeout event, the memory wrapper runs an explicit `delete activeUsers[userId]` operator. This breaks reference retention and permits immediate garbage collection, completely preventing memory leaks.

---

## 2. Firebase Cloud Messaging (FCM) Pipeline

FCM is leveraged as an out-of-band push architecture designed specifically to bypass runtime network restrictions on mobile devices.

### Delivery Logic Flow
1. **Payload Dispatch:** User A transmits a payload via `send_message`.
2. **Session Inspection:** The Node.js server evaluates the `activeUsers` state map for the targeted `receiver_id`.
3. **Branch Execution:**
    * **Online State:** If present, the message routes directly through the existing open Socket.io channel (latency < 20ms).
    * **Offline State:** If absent, the server queries the `device_tokens` table for the target's target device registration token, builds an FCM payload container, and fires it asynchronously via the Firebase Admin SDK.
4. **Device Awakening:** The device operating system intercepts the low-level FCM push packet, waking the interface layer to display the notification layout.

---

## 3. High-Performance Mobile Cache (`react-native-mmkv`)

Traditional React Native storage systems rely on the asynchronous React Native bridge to serialize data into JSON strings across to native operating systems (iOS/Android). 

**MMKV** bypasses this limitation completely by binding directly to the JavaScript engine via the **JavaScript Interface (JSI)**.
* **Synchronous Access:** Read and write sequences execute directly into a custom C++ memory-mapped file framework.
* **Execution Advantage:** Token verification and offline data arrays load instantaneously during components' `useEffect` mount phase, providing desktop-grade data access speed.