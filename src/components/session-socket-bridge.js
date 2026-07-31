import useSessionSocket from "../hooks/use-session-socket";

/** Mounts socket session listeners inside the game layout (needs Context). */
const SessionSocketBridge = () => {
  useSessionSocket();
  return null;
};

export default SessionSocketBridge;
