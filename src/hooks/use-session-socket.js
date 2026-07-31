import { useCallback, useContext, useEffect, useRef } from "react";
import { Context } from "../context/store";
import socket from "../components/utils/socket-connect";
import {
  getFromLocalStorage,
  removeItem,
  setLocalStorage,
} from "../components/utils/local-storage";

const SESSION_EXPIRED_EVENTS = [
  "session.expired",
  "session_expired",
  "user.session.expired",
  "unauthorized",
  "logout",
  "force_logout",
];

const looksExpired = (payload) => {
  if (payload == null) return false;
  if (typeof payload === "string") {
    return /session\s*expired|unauthorized|unauthenticated|token\s*expired|please\s*login/i.test(
      payload
    );
  }
  if (typeof payload !== "object") return false;

  const status = payload.status ?? payload.code ?? payload.error_code;
  if (status === 401 || status === 403 || status === "401" || status === "403") {
    return true;
  }
  if (payload.expired === true || payload.session_expired === true) {
    return true;
  }

  const message = [
    payload.message,
    payload.msg,
    payload.error,
    payload.result,
    payload.reason,
    payload.event,
    payload.type,
  ]
    .filter(Boolean)
    .join(" ");

  return /session\s*expired|unauthorized|unauthenticated|token\s*expired|please\s*login/i.test(
    message
  );
};

/**
 * Connects the Surebet socket for live profile/balance and opens the login
 * modal when the socket signals session expiry / unauthorized.
 */
const useSessionSocket = () => {
  const [state, dispatch] = useContext(Context);
  const profileIdRef = useRef(null);

  const openSessionExpiredModal = useCallback(
    (message = "User Session Expired. Please Login Again") => {
      removeItem("user");
      profileIdRef.current = null;
      dispatch({ type: "DEL", key: "user" });
      dispatch({ type: "SET", key: "sessionMessage", payload: message });
      dispatch({ type: "SET", key: "showloginmodal", payload: true });
    },
    [dispatch]
  );

  const applyProfileUpdate = useCallback(
    (data) => {
      if (looksExpired(data)) {
        openSessionExpiredModal(
          typeof data?.message === "string"
            ? data.message
            : "User Session Expired. Please Login Again"
        );
        return;
      }

      const stored = getFromLocalStorage("user");
      if (!stored) return;

      const nextUser = {
        ...stored,
        balance: data?.balance ?? stored.balance,
        bonus_balance: data?.bonus ?? data?.bonus_balance ?? stored.bonus_balance,
      };
      setLocalStorage("user", nextUser);
      // Avoid balance flicker while the coin is spinning
      if (!state?.iscoinrotating) {
        dispatch({ type: "SET", key: "user", payload: nextUser });
      }
    },
    [dispatch, openSessionExpiredModal, state?.iscoinrotating]
  );

  useEffect(() => {
    try {
      if (!socket.connected) {
        socket.connect();
      }
    } catch {
      // Socket optional for unauthenticated local play
    }

    const onExpired = (payload) => {
      const message =
        (typeof payload === "string" && payload) ||
        payload?.message ||
        payload?.msg ||
        payload?.result ||
        "User Session Expired. Please Login Again";
      openSessionExpiredModal(message);
    };

    SESSION_EXPIRED_EVENTS.forEach((event) => {
      socket.on(event, onExpired);
    });

    const onConnectError = (err) => {
      if (looksExpired(err?.message) || looksExpired(err)) {
        openSessionExpiredModal();
      }
    };
    socket.on("connect_error", onConnectError);

    return () => {
      SESSION_EXPIRED_EVENTS.forEach((event) => {
        socket.off(event, onExpired);
      });
      socket.off("connect_error", onConnectError);
    };
  }, [openSessionExpiredModal]);

  // Subscribe to live profile channel when a user is present
  useEffect(() => {
    const user = state?.user || getFromLocalStorage("user");
    const profileId = user?.profile_id;
    if (!profileId) {
      if (profileIdRef.current) {
        socket.off(`user#profile#${profileIdRef.current}`);
        profileIdRef.current = null;
      }
      return undefined;
    }

    const channel = `user#profile#${profileId}`;
    profileIdRef.current = profileId;

    const onProfile = (data) => applyProfileUpdate(data);
    socket.on(channel, onProfile);

    const emitProfile = () => {
      if (socket.connected) {
        socket.emit("user.profile", profileId);
      }
    };

    emitProfile();
    socket.on("connect", emitProfile);

    return () => {
      socket.off(channel, onProfile);
      socket.off("connect", emitProfile);
    };
  }, [state?.user, applyProfileUpdate]);
};

export default useSessionSocket;
