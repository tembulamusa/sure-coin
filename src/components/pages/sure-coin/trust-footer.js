import React from "react";
import { FaShieldAlt, FaLock, FaEye } from "react-icons/fa";

const TrustFooter = () => (
  <footer className="sc-trust-footer">
    <span>
      <FaShieldAlt /> Provably Fair
    </span>
    <span className="sc-trust-sep">|</span>
    <span>
      <FaLock /> Secure
    </span>
    <span className="sc-trust-sep">|</span>
    <span>
      <FaEye /> Transparent
    </span>
  </footer>
);

export default React.memo(TrustFooter);
