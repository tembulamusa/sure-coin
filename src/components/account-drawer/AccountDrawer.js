import React, { useContext, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUser,
  FaWallet,
  FaGift,
  FaLock,
  FaListUl,
  FaMobileAlt,
  FaBullhorn,
  FaShieldAlt,
  FaCheck,
} from "react-icons/fa";
import { GiTwoCoins } from "react-icons/gi";
import { MdClose, MdUpload } from "react-icons/md";
import { Context } from "../../context/store";
import { formatKes } from "../pages/sure-coin/betting-sidebar/bets-feed";
import AccountDrawerRow from "./AccountDrawerRow";

const formatMsisdn = (raw) => {
  const digits = String(raw || "").replace(/\D/g, "");
  let local = digits;
  if (local.startsWith("254") && local.length >= 12) {
    local = local.slice(0, 12);
    return `+${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6, 9)} ${local.slice(9)}`;
  }
  if (local.startsWith("0") && local.length === 10) {
    return `+254 ${local.slice(1, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
  }
  if (local.length === 9) {
    return `+254 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
  }
  return raw ? String(raw) : "—";
};

const money = (value) => `KSh ${formatKes(value)}`;

/**
 * BetMundial-style slide-in account drawer (Surecoin gold accents).
 */
const AccountDrawer = ({ open, onClose }) => {
  const [state, dispatch] = useContext(Context);
  const navigate = useNavigate();
  const user = state?.user;

  const cash = user?.cash_balance ?? user?.balance ?? 0;
  const bonus = user?.bonus_balance ?? 0;
  const promoWins = user?.promo_wins_count ?? 0;
  const verified = user?.verified !== false;

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const openWallet = useCallback(
    (mode) => {
      onClose?.();
      dispatch({
        type: "SET",
        key: "promptdepositrequest",
        payload: { show: true, mode },
      });
    },
    [dispatch, onClose]
  );

  const go = useCallback(
    (path) => {
      onClose?.();
      if (path) navigate(path);
    },
    [navigate, onClose]
  );

  const focusBets = useCallback(() => {
    onClose?.();
    const el =
      document.querySelector(".sc-betting-sidebar") ||
      document.querySelector(".sc-betting-sidebar-shell");
    el?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
  }, [onClose]);

  if (!open) return null;

  return (
    <div className="sc-acct-overlay" role="presentation" onClick={onClose}>
      <aside
        className="sc-acct-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sc-acct-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sc-acct-drawer__head">
          <div className="sc-acct-drawer__head-main">
            <span className="sc-acct-avatar sc-acct-avatar--sm" aria-hidden="true">
              <FaUser />
            </span>
            <div>
              <h2 id="sc-acct-title" className="sc-acct-drawer__title">
                Account
              </h2>
              <p className="sc-acct-drawer__subtitle">
                Manage your account and wallet
              </p>
            </div>
          </div>
          <button
            type="button"
            className="sc-acct-close"
            aria-label="Close account drawer"
            onClick={onClose}
          >
            <MdClose />
          </button>
        </header>

        <div className="sc-acct-drawer__body">
          <div className="sc-acct-user">
            <span className="sc-acct-avatar sc-acct-avatar--lg" aria-hidden="true">
              <FaUser />
            </span>
            <div className="sc-acct-user__meta">
              <div className="sc-acct-user__phone">
                {formatMsisdn(user?.msisdn)}
              </div>
              {verified && (
                <span className="sc-acct-verified">
                  <FaCheck aria-hidden="true" />
                  Verified Account
                </span>
              )}
            </div>
          </div>

          <section className="sc-acct-wallet" aria-label="Wallet">
            <div className="sc-acct-wallet__label">
              <FaWallet aria-hidden="true" />
              WALLET
            </div>
            <div className="sc-acct-wallet__grid">
              <div className="sc-acct-wallet__available">
                <span className="sc-acct-wallet__caption">Available Balance</span>
                <span className="sc-acct-wallet__amount">{money(cash)}</span>
              </div>
              <div className="sc-acct-wallet__side">
                <div className="sc-acct-wallet__row">
                  <span className="sc-acct-wallet__side-label">
                    <FaGift aria-hidden="true" /> Bonus
                  </span>
                  <span className="sc-acct-wallet__side-val">{money(bonus)}</span>
                </div>
              </div>
            </div>
          </section>

          <div className="sc-acct-actions">
            <button
              type="button"
              className="sc-acct-btn sc-acct-btn--deposit"
              onClick={() => openWallet("deposit")}
            >
              <GiTwoCoins aria-hidden="true" />
              Deposit
            </button>
            <button
              type="button"
              className="sc-acct-btn sc-acct-btn--withdraw"
              onClick={() => openWallet("withdraw")}
            >
              <MdUpload aria-hidden="true" />
              Withdraw
            </button>
          </div>

          <div className="sc-acct-section-label">ACTIVITY</div>
          <div className="sc-acct-list">
            <AccountDrawerRow
              icon={<FaListUl />}
              label="My Bets"
              onClick={focusBets}
            />
            <AccountDrawerRow
              icon={<FaGift />}
              label="Promo Wins"
              badge={promoWins}
              onClick={onClose}
            />
            <AccountDrawerRow
              icon={<FaMobileAlt />}
              label="Check MPESA Deposit status"
              onClick={() => openWallet("deposit")}
            />
            <AccountDrawerRow
              icon={<FaBullhorn />}
              label="Promotions"
              onClick={onClose}
            />
          </div>

          <div className="sc-acct-section-label">ACCOUNT</div>
          <div className="sc-acct-list">
            <AccountDrawerRow
              icon={<FaLock />}
              label="Change Password"
              onClick={() => go("/forgot-password")}
            />
            <AccountDrawerRow
              icon={<FaShieldAlt />}
              label="Exclude myself from betting"
              onClick={onClose}
            />
          </div>
        </div>
      </aside>
    </div>
  );
};

export default React.memo(AccountDrawer);
