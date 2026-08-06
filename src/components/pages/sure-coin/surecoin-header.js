import React, { useContext, useState, useCallback } from "react";
import { BiSolidVolumeMute } from "react-icons/bi";
import { FaVolumeHigh, FaUser } from "react-icons/fa6";
import { Context } from "../../../context/store";
import SureCoinLogoImg from "../../../assets/surecoin/logo.png";
import { formatKes } from "./betting-sidebar/bets-feed";
import { removeItem } from "../../utils/local-storage";
import AccountDrawer from "../../account-drawer";

const SurecoinHeader = ({
  userMuted,
  setUserMuted,
  onEnableSound,
  setUserSoundSet,
  coinsAlertMsg,
  networkBackOnCount,
  isOnline,
}) => {
  const [state, dispatch] = useContext(Context);
  const [accountOpen, setAccountOpen] = useState(false);
  const balance = state?.user?.balance;
  const loggedIn = Boolean(state?.user?.token);

  const openAuth = (mode) => {
    dispatch({ type: "SET", key: "authModalMode", payload: mode });
    dispatch({ type: "SET", key: "showloginmodal", payload: true });
  };

  const closeAccount = useCallback(() => setAccountOpen(false), []);

  const handleLogout = () => {
    try {
      removeItem("user");
    } catch (_) {
      /* ignore */
    }
    setAccountOpen(false);
    dispatch({ type: "DEL", key: "user" });
    dispatch({ type: "DEL", key: "mybets" });
    dispatch({ type: "DEL", key: "showloginmodal" });
    dispatch({ type: "DEL", key: "authModalMode" });
  };

  return (
    <header className="sc-header">
      {coinsAlertMsg && (
        <div
          className={`sure-alert height-hide ${
            coinsAlertMsg.status === 200 ? "success" : "error"
          }`}
        >
          {coinsAlertMsg.message}
        </div>
      )}

      <div
        className={`network-changes ${
          networkBackOnCount === 1 && isOnline ? "just-back" : ""
        } ${(!isOnline || networkBackOnCount > 0) && "show"}`}
      >
        {!isOnline ? "You are offline" : "You are back online"}
      </div>

      <div className="sc-header-brand">
        <img
          src={SureCoinLogoImg}
          alt="Surecoin"
          className="surecoin-logo-img"
        />
      </div>

      <div className="sc-header-actions">
        {loggedIn ? (
          <>
            <div className="sc-balance">
              <span className="sc-balance-label">Balance</span>
              <span className="sc-balance-value">
                KES. {balance != null ? formatKes(balance) : "0.00"}
              </span>
            </div>
            <button
              type="button"
              className="sc-account-trigger"
              onClick={() => setAccountOpen(true)}
              aria-label="My Account"
              aria-expanded={accountOpen}
              aria-haspopup="dialog"
            >
              <span className="sc-account-trigger__icon" aria-hidden="true">
                <FaUser />
              </span>
              <span className="sc-account-trigger__label">My Account</span>
            </button>
            <button
              type="button"
              className="sc-auth-btn sc-auth-btn--ghost"
              onClick={handleLogout}
            >
              Logout
            </button>
          </>
        ) : (
          <div className="sc-auth-links">
            <button
              type="button"
              className="sc-auth-btn sc-auth-btn--ghost"
              onClick={() => openAuth("login")}
            >
              Login
            </button>
            <button
              type="button"
              className="sc-auth-btn sc-auth-btn--primary"
              onClick={() => openAuth("register")}
            >
              Register
            </button>
          </div>
        )}
        <button
          type="button"
          className="sc-sound-btn"
          aria-label={userMuted ? "Unmute" : "Mute"}
          onClick={async () => {
            if (userMuted) {
              await onEnableSound?.();
              setUserSoundSet?.(true);
              setUserMuted(false);
            } else {
              setUserMuted(true);
            }
          }}
        >
          {userMuted ? <BiSolidVolumeMute /> : <FaVolumeHigh />}
        </button>
      </div>

      {loggedIn && (
        <AccountDrawer open={accountOpen} onClose={closeAccount} />
      )}
    </header>
  );
};

export default React.memo(SurecoinHeader);
