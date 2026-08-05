import { io } from "socket.io-client";

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL;

/** Platform balance socket — off when REACT_APP_SOCKET_URL is unset (local sim). */
export const isPlatformSocketEnabled = Boolean(
  SOCKET_URL && SOCKET_URL !== "disabled"
);

const noopSocket = {
  connected: false,
  connect() {},
  disconnect() {},
  on() {},
  off() {},
  emit() {},
};

const socket = isPlatformSocketEnabled
  ? io(SOCKET_URL, {
      transports: ["websocket"],
      autoConnect: false,
      pingInterval: 1000,
      pingTimeout: 3000,
      reconnection: true,
      upgradeTimeout: 1000,
      EIO: 4,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 3000,
    })
  : noopSocket;

export default socket;
