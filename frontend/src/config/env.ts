// Note: For Android physical devices, do NOT use localhost or 127.0.0.1.
// Find your Mac Mini LAN IP by running: ipconfig getifaddr en0
// Ensure both the Mac Mini and your Samsung S22 are on the same Wi-Fi/network.

export const DEV_MACHINE_IP = 'REPLACE_WITH_MAC_MINI_LAN_IP';

export const API_BASE_URL = `http://${DEV_MACHINE_IP}:3000/api`;
export const SOCKET_URL = `http://${DEV_MACHINE_IP}:3000`;
