import React from "react";
import { MdChevronRight } from "react-icons/md";

/**
 * Reusable list row for the account drawer.
 * @param {{ icon: React.ReactNode, label: string, badge?: string|number, onClick?: () => void }} props
 */
const AccountDrawerRow = ({ icon, label, badge, onClick }) => (
  <button type="button" className="sc-acct-row" onClick={onClick}>
    <span className="sc-acct-row__icon" aria-hidden="true">
      {icon}
    </span>
    <span className="sc-acct-row__label">
      {label}
      {badge != null && badge !== "" && (
        <span className="sc-acct-row__badge">{badge}</span>
      )}
    </span>
    <MdChevronRight className="sc-acct-row__chevron" aria-hidden="true" />
  </button>
);

export default React.memo(AccountDrawerRow);
