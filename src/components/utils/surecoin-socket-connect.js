import { io } from "socket.io-client";
import { getFromLocalStorage } from "./local-storage";

const SOCKET_URL =
  process.env.REACT_APP_SURECOIN_SOCKET_URL || "http://localhost:6006";

let socketInstance = null;

export const getSurecoinSocket = () => {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
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
  const token = user?.token;

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
