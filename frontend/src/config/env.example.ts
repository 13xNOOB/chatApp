// Note: For Android physical devices, do NOT use localhost or 127.0.0.1.
// Find your machine's LAN IP by running: ipconfig getifaddr en0 (on Mac) or ipconfig (on Windows)
// Ensure both the computer and your Android device are on the same Wi-Fi/network.

// For physical device testing, uncomment this and replace with your local IP:
export const DEV_MACHINE_IP = '192.168.0.X';

// For iOS Simulator testing only (if the backend is running locally on the same machine):
// export const DEV_MACHINE_IP = '127.0.0.1';

export const API_BASE_URL = `http://${DEV_MACHINE_IP}:3000/api`;
export const SOCKET_URL = `http://${DEV_MACHINE_IP}:3000`;
