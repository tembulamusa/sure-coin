import useSessionSocket from "../hooks/use-session-socket";
import useSurecoinSocket from "../hooks/use-surecoin-socket";

/** Mounts platform + SureCoin game socket listeners inside the game layout. */
const SessionSocketBridge = () => {
  useSessionSocket();
  useSurecoinSocket();
  return null;
};

export default SessionSocketBridge;
