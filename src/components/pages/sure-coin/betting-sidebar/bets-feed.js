const NAME_POOL = [
  "david", "james", "kevin", "brian", "alice", "mary", "john", "peter",
  "grace", "samuel", "nancy", "mike", "lucy", "tony", "diana", "oscar",
  "felix", "ruth", "paul", "helen", "chris", "anne", "mark", "susan",
];

const AVATAR_COLORS = [
  "#FFC107", "#4CAF50", "#42A5F5", "#EF5350", "#AB47BC",
  "#26A69A", "#FF7043", "#7E57C2", "#EC407A", "#66BB6A",
];

export const maskPlayerName = (name = "") => {
  const clean = String(name).replace(/\s+/g, "");
  if (clean.length <= 2) return `${clean[0] || "x"}***`;
  return `${clean[0]}***${clean[clean.length - 1]}`;
};

export const formatKes = (value) => {
  const num = Number(value) || 0;
  return num.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const pickName = (seed) => NAME_POOL[seed % NAME_POOL.length];

export const formatChoice = (choice) => {
  if (choice === "heads") return "H";
  if (choice === "tails") return "T";
  return "—";
};

export const createBetEntry = ({
  id,
  seed,
  amount,
  settled = false,
  won = false,
  choice,
}) => {
  const name = pickName(seed);
  // Unsettled / losers: no win amount (UI shows —). Winners only after settle.
  const multiplier = settled && won ? 2 : null;
  const win = settled && won ? amount * 2 : null;
  const side = choice === "heads" || choice === "tails"
    ? choice
    : seed % 2 === 0
      ? "heads"
      : "tails";

  return {
    id,
    seed,
    player: maskPlayerName(name),
    rawName: name,
    avatarColor: AVATAR_COLORS[seed % AVATAR_COLORS.length],
    bet: amount,
    choice: side,
    multiplier,
    win,
    settled,
    won: settled ? won : false,
  };
};

export const randomBetAmount = () => {
  const tiers = [5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];
  return tiers[Math.floor(Math.random() * tiers.length)];
};

/**
 * Settle live bets after the coin outcome lands.
 * Winners get x2; losers keep win empty (UI shows —).
 * When outcomeSide is heads/tails, match bet.choice; otherwise random.
 */
export const settleBets = (bets, outcomeSide = null, winRate = 0.48) => {
  const side = outcomeSide
    ? String(outcomeSide).trim().toLowerCase()
    : null;
  const useOutcome = side === "heads" || side === "tails";

  return bets.map((bet) => {
    const won = useOutcome ? bet.choice === side : Math.random() < winRate;
    return {
      ...bet,
      settled: true,
      won,
      multiplier: won ? 2 : null,
      win: won ? bet.bet * 2 : null,
    };
  });
};

export const sortTopWins = (bets) =>
  [...bets]
    .filter((b) => Number(b.win) > 0)
    .sort((a, b) => b.win - a.win || (b.multiplier || 0) - (a.multiplier || 0));

export const sumWins = (bets) =>
  bets.reduce((total, bet) => total + (Number(bet.win) || 0), 0);
