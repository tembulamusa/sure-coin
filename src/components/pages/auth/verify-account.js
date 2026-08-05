import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/** OTP verify is not required for native SureCoin signup — redirect to game. */
const VerifyAccount = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/game", { replace: true });
  }, [navigate]);
  return null;
};

export default VerifyAccount;
