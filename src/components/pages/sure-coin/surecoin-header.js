import React, { useContext } from "react";
import { BiSolidVolumeMute } from "react-icons/bi";
import { FaVolumeHigh } from "react-icons/fa6";
import { Context } from "../../../context/store";
import SureCoinLogoImg from "../../../assets/surecoin/logo.png";
import { formatKes } from "./betting-sidebar/bets-feed";

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
  const balance = state?.user?.balance;
  const loggedIn = Boolean(state?.user?.token);

  const openWallet = (mode) => {
    if (!loggedIn) {
      dispatch({ type: "SET", key: "showloginmodal", payload: true });
      return;
    }
    dispatch({
      type: "SET",
      key: "promptdepositrequest",
      payload: { show: true, mode },
    });
  };

  return (
    <header className="sc-header">
      {coinsAlertMsg && (
        <div
          className={`sure-alert height-hide ${
            coinsAlertMsg.status == 200 ? "success" : "error"
          }`}
        >
          {coinsAlertMsg.message}
        </div>
      )}

      <div
        className={`network-changes ${
          networkBackOnCount == 1 && isOnline ? "just-back" : ""
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
        <div className="sc-balance">
          <span className="sc-balance-label">Balance</span>
          <span className="sc-balance-value">
            KES. {balance != null ? formatKes(balance) : "0.00"}
          </span>
        </div>
        <button type="button" className="sc-sound-btn" onClick={() => openWallet("deposit")}>
          +
        </button>
        <button type="button" className="sc-sound-btn" onClick={() => openWallet("withdraw")}>
          −
        </button>
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
    </header>
  );
};

export default React.memo(SurecoinHeader);
