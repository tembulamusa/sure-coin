import { getFromLocalStorage, setLocalStorage } from "../components/utils/local-storage";

const isLocalSim = process.env.REACT_APP_LOCAL_SIM === "true";

/**
 * Seeds a dev session when running against the local simulation backend.
 * CRA only reads env at startup — set REACT_APP_LOCAL_SIM_DEV_TOKEN in .env.local.
 */
export const bootstrapLocalSim = () => {
  if (!isLocalSim) {
    return;
  }

  const token = process.env.REACT_APP_LOCAL_SIM_DEV_TOKEN;
  if (!token) {
    console.warn(
      "[local-sim] REACT_APP_LOCAL_SIM_DEV_TOKEN is missing — socket will not connect until you log in."
    );
    return;
  }

  const existing = getFromLocalStorage("user");
  const devUser = {
    profile_id: Number(process.env.REACT_APP_LOCAL_SIM_PROFILE_ID || 1),
    msisdn: process.env.REACT_APP_LOCAL_SIM_MSISDN || "254700000001",
    display_name: process.env.REACT_APP_LOCAL_SIM_DISPLAY_NAME || "Dev Player 1",
    balance: existing?.balance ?? 1100,
    cash_balance: existing?.cash_balance ?? 1000,
    bonus_balance: existing?.bonus_balance ?? 100,
    token,
  };

  setLocalStorage("user", devUser);
};

export default bootstrapLocalSim;
