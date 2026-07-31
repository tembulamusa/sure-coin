import { io } from "socket.io-client";

const SOCKET_URL =
  process.env.REACT_APP_SOCKET_URL || "wss://wss.surebet.co.ke/surebet";

const socket = io(SOCKET_URL, {
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
});

export default socket;
