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
      transports: ["websocket", "polling"],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 3000,
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
    socket.io.opts.query = { token };
    socket.io.opts.extraHeaders = {
      Authorization: `Bearer ${token}`,
    };
  } else {
    socket.auth = {};
    socket.io.opts.query = {};
    socket.io.opts.extraHeaders = {};
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
