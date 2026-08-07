import { io } from "socket.io-client";
import { getFromLocalStorage } from "./local-storage";

const SURECOIN_PUBLIC_URL = process.env.REACT_APP_SURECOIN_PUBLIC_URL;
const SURECOIN_USER_URL = process.env.REACT_APP_SURECOIN_URL;
const SOCKET_URL =
  process.env.REACT_APP_SURECOIN_SOCKET_URL ||
  SURECOIN_PUBLIC_URL ||
  SURECOIN_USER_URL?.replace(/\/user\/?$/, "/") ||
  "https://lakicoin.com";
const SOCKET_PATH = process.env.REACT_APP_SURECOIN_SOCKET_PATH || "/socket.io/";

let socketInstance = null;
let lastAuthToken = null;

export const getSurecoinSocket = () => {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      path: SOCKET_PATH,
      // Prefer websocket; avoid polling→upgrade churn behind Cloudflare/nginx.
      transports: ["websocket"],
      upgrade: false,
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      // Engine.IO defaults are fine; keep ping visible under proxy idle limits.
      timeout: 20000,
    });
  }
  return socketInstance;
};

export const connectSurecoinSocket = () => {
  const socket = getSurecoinSocket();
  const user = getFromLocalStorage("user");
  const token = user?.token || null;

  if (token) {
    socket.auth = { token };
    // Keep query token for netty-socketio handshake readers; only set when changed
    // so Engine.IO does not tear down an open websocket.
    if (socket.io.opts.query?.token !== token) {
      socket.io.opts.query = { token };
    }
  } else {
    socket.auth = {};
    if (socket.io.opts.query?.token) {
      socket.io.opts.query = {};
    }
  }

  const authChanged = lastAuthToken !== token;
  lastAuthToken = token;

  if (socket.connected && authChanged) {
    socket.disconnect();
  }

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
};

export const disconnectSurecoinSocket = () => {
  if (socketInstance?.connected) {
    socketInstance.disconnect();
  }
};

export default getSurecoinSocket;
