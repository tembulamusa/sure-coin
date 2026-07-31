import React from "react";

const PERIODS = [
  { id: "day", label: "Day" },
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
];

const METRICS = [
  { id: "x", label: "X" },
  { id: "win", label: "Win" },
  { id: "rounds", label: "Rounds" },
];

const FilterRow = ({ options, value, onChange, ariaLabel }) => (
  <div className="sc-top-filter-row" role="group" aria-label={ariaLabel}>
    {options.map((option) => {
      const active = value === option.id;
      return (
        <button
          key={option.id}
          type="button"
          className={`sc-top-filter-btn${active ? " active" : ""}`}
          aria-pressed={active}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      );
    })}
  </div>
);

/**
 * Top-tab filters — period first (Day / Month / Year), then metric (X / Win / Rounds).
 */
const TopBetsFilters = ({
  period = "day",
  metric = "x",
  onPeriodChange,
  onMetricChange,
}) => (
  <div className="sc-top-filters">
    <FilterRow
      options={PERIODS}
      value={period}
      onChange={onPeriodChange}
      ariaLabel="Top period"
    />
    <FilterRow
      options={METRICS}
      value={metric}
      onChange={onMetricChange}
      ariaLabel="Top ranking"
    />
  </div>
);

export default React.memo(TopBetsFilters);
