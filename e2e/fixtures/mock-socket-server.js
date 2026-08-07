/**
 * Lightweight Socket.IO mock for Playwright coin-roll e2e.
 * Port defaults to 6016 (prod SureCoin.jar often owns 6006).
 *
 * Supports multi-player bets in one round (unique bet ids, per-socket accept).
 *
 * Control API:
 *   GET  /health | /e2e/status | /e2e/last-bet | /e2e/bets
 *   POST /e2e/waiting | /e2e/flip-start | /e2e/result | /e2e/flip
 */
const http = require("http");
const { Server } = require("socket.io");

const SOCKET_PORT = Number(process.env.E2E_SOCKET_PORT || 6016);

let httpServer = null;
let io = null;
let lastBet = null;
let nextBetId = 9001;
/** @type {Array<object>} */
let bets = [];
/** @type {{ phase: string, payload: object }} */
let roundSnapshot = {
  phase: "WAITING",
  payload: null,
};

function waitingPayload(overrides = {}) {
  return {
    round_id: 1001,
    round_number: 42,
    phase: "WAITING",
    seconds_remaining: 120,
    wait_seconds: 120,
    bet_count: 0,
    heads_count: 0,
    tails_count: 0,
    total_stake: 0,
    ...overrides,
  };
}

function setSnapshot(phase, payload) {
  roundSnapshot = { phase, payload };
}

function betStats() {
  const heads = bets.filter((b) => b.coin_side === "HEADS").length;
  const tails = bets.filter((b) => b.coin_side === "TAILS").length;
  const totalStake = bets.reduce((sum, b) => sum + Number(b.stake || 0), 0);
  return {
    bet_count: bets.length,
    heads_count: heads,
    tails_count: tails,
    total_stake: totalStake,
  };
}

function emitToClients(eventName, payload) {
  if (!io) {
    throw new Error("Mock socket server is not running");
  }
  io.emit(eventName, payload);
}

/**
 * Match prod: on connect send round:sync (APPLY_ROUND) — never round:waiting,
 * which would NEW_ROUND and wipe myBet / liveBets on reconnect.
 */
function syncSocket(socket) {
  const { phase, payload } = roundSnapshot;
  const base = payload || waitingPayload();
  socket.emit("round:sync", {
    ...base,
    phase: phase || base.phase || "WAITING",
    ...betStats(),
  });
}

function readJsonBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (_) {
        resolve({});
      }
    });
  });
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function emitWaiting(overrides = {}) {
  lastBet = null;
  bets = [];
  nextBetId = 9001;
  const payload = waitingPayload(overrides);
  setSnapshot("WAITING", payload);
  emitToClients("round:waiting", payload);
}

function emitFlipStart({ flipSeconds = 2 } = {}) {
  const stats = betStats();
  const payload = {
    round_id: 1001,
    round_number: 42,
    phase: "FLIPPING",
    flip_seconds: flipSeconds,
    seconds_remaining: flipSeconds,
    ...stats,
  };
  setSnapshot("FLIPPING", payload);
  emitToClients("round:flip_start", payload);
  emitToClients("round:flip_tick", {
    round_id: 1001,
    phase: "FLIPPING",
    seconds_remaining: Math.max(1, flipSeconds - 1),
    progress: 50,
    ...stats,
  });
}

function emitResult({ winningSide = "HEADS" } = {}) {
  const side = String(winningSide).toUpperCase();
  const stats = betStats();

  const payload = {
    round_id: 1001,
    round_number: 42,
    phase: "RESULT",
    seconds_remaining: 30,
    winning_side: side,
    ...stats,
  };
  setSnapshot("RESULT", payload);
  emitToClients("round:result", payload);

  const settled = bets.map((bet) => {
    const won = String(bet.coin_side).toUpperCase() === side;
    const resolved = {
      bet_id: bet.bet_id,
      round_id: 1001,
      won,
      // Backend historically used `win`; UI reads `won` — send both.
      win: won,
      payout: won ? bet.possible_win : 0,
      coin_side: bet.coin_side,
      stake: bet.stake,
      display_name: bet.display_name,
      status: won ? "WON" : "LOST",
    };
    const owner = io?.sockets?.sockets?.get(bet.socketId);
    if (owner) {
      owner.emit("bet:resolved", resolved);
    }
    return resolved;
  });

  emitToClients("round:bets_settled", { bets: settled });
}

function acceptBet(socket, payload = {}) {
  const coinSide = String(payload.coin_side || "HEADS").toUpperCase();
  const stake = Number(payload.bet_amount) || 5;
  const sessionId = String(payload.session_id || "");
  const profileId = sessionId.split(":")[0] || socket.id.slice(0, 6);

  const existing = bets.find(
    (b) => b.socketId === socket.id || String(b.profile_id) === String(profileId)
  );
  if (existing) {
    // Soft duplicate like backend — return existing, no second broadcast
    socket.emit("bet:accepted", {
      bet_id: existing.bet_id,
      coin_side: existing.coin_side,
      stake: existing.stake,
      possible_win: existing.possible_win,
      round_id: existing.round_id,
    });
    return existing;
  }

  const displayName =
    payload.display_name || `Player ${profileId}`.slice(0, 24);

  lastBet = {
    bet_id: nextBetId++,
    coin_side: coinSide,
    stake,
    possible_win: stake * 2,
    round_id: 1001,
    profile_id: profileId,
    display_name: displayName,
    socketId: socket.id,
  };
  bets.push(lastBet);

  socket.emit("bet:accepted", {
    bet_id: lastBet.bet_id,
    coin_side: lastBet.coin_side,
    stake: lastBet.stake,
    possible_win: lastBet.possible_win,
    round_id: lastBet.round_id,
  });

  io.emit("round:bet", {
    bet_id: lastBet.bet_id,
    round_id: 1001,
    display_name: displayName,
    coin_side: coinSide,
    stake,
    multiplier: 2,
    win: stake * 2,
    status: "OPEN",
  });

  // Keep waiting snapshot counts fresh for late joiners / sync
  if (roundSnapshot.phase === "WAITING") {
    setSnapshot("WAITING", {
      ...(roundSnapshot.payload || waitingPayload()),
      phase: "WAITING",
      ...betStats(),
    });
    emitToClients("round:tick", {
      round_id: 1001,
      phase: "WAITING",
      seconds_remaining:
        roundSnapshot.payload?.seconds_remaining ?? 120,
      ...betStats(),
    });
  }

  return lastBet;
}

function startMockSocketServer(port = SOCKET_PORT) {
  if (io) {
    return Promise.resolve({ io, port });
  }

  setSnapshot("WAITING", waitingPayload());

  return new Promise((resolve, reject) => {
    httpServer = http.createServer(async (req, res) => {
      const url = req.url?.split("?")[0] || "";

      if (req.method === "GET" && url === "/health") {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("ok");
        return;
      }

      if (req.method === "GET" && url === "/e2e/status") {
        sendJson(res, 200, {
          phase: roundSnapshot.phase,
          clients: io ? io.engine.clientsCount : 0,
          lastBet,
          betCount: bets.length,
          bets: bets.map(({ socketId, ...rest }) => rest),
        });
        return;
      }

      if (req.method === "GET" && url === "/e2e/last-bet") {
        sendJson(res, 200, { lastBet });
        return;
      }

      if (req.method === "GET" && url === "/e2e/bets") {
        sendJson(res, 200, {
          bets: bets.map(({ socketId, ...rest }) => rest),
          ...betStats(),
        });
        return;
      }

      if (req.method === "POST" && url === "/e2e/waiting") {
        const body = await readJsonBody(req);
        emitWaiting(body);
        sendJson(res, 200, { ok: true });
        return;
      }

      if (req.method === "POST" && url === "/e2e/flip-start") {
        const body = await readJsonBody(req);
        emitFlipStart({
          flipSeconds: body.flipSeconds != null ? Number(body.flipSeconds) : 2,
        });
        sendJson(res, 200, { ok: true, ...betStats() });
        return;
      }

      if (req.method === "POST" && url === "/e2e/result") {
        const body = await readJsonBody(req);
        emitResult({ winningSide: body.winningSide || "HEADS" });
        sendJson(res, 200, { ok: true, lastBet, ...betStats() });
        return;
      }

      if (req.method === "POST" && url === "/e2e/flip") {
        const body = await readJsonBody(req);
        emitFlipStart({
          flipSeconds: body.flipSeconds != null ? Number(body.flipSeconds) : 2,
        });
        emitResult({ winningSide: body.winningSide || "HEADS" });
        sendJson(res, 200, { ok: true, lastBet, ...betStats() });
        return;
      }

      res.writeHead(404);
      res.end();
    });

    io = new Server(httpServer, {
      path: "/socket.io/",
      cors: { origin: "*", methods: ["GET", "POST"] },
      transports: ["websocket", "polling"],
    });

    io.on("connection", (socket) => {
      syncSocket(socket);
      socket.on("bet:place", (payload = {}) => {
        if (roundSnapshot.phase !== "WAITING") {
          socket.emit("bet:rejected", {
            reason: "ROUND_NOT_OPEN",
          });
          return;
        }
        acceptBet(socket, payload);
      });
    });

    httpServer.once("error", reject);
    httpServer.listen(port, "127.0.0.1", () => {
      resolve({ io, port });
    });
  });
}

function stopMockSocketServer() {
  return new Promise((resolve) => {
    if (!io && !httpServer) {
      resolve();
      return;
    }
    const done = () => {
      io = null;
      httpServer = null;
      lastBet = null;
      bets = [];
      nextBetId = 9001;
      setSnapshot("WAITING", waitingPayload());
      resolve();
    };
    if (io) {
      io.close(() => {
        if (httpServer) {
          httpServer.close(done);
        } else {
          done();
        }
      });
    } else if (httpServer) {
      httpServer.close(done);
    } else {
      done();
    }
  });
}

module.exports = {
  SOCKET_PORT,
  waitingPayload,
  startMockSocketServer,
  stopMockSocketServer,
  emitToClients,
  emitWaiting,
  emitFlipStart,
  emitResult,
};
