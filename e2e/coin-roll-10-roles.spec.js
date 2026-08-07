const { test, expect } = require("@playwright/test");
const { installSurecoinApiMocks } = require("./fixtures/mock-api");
const { seedLoggedInUser } = require("./fixtures/auth");
const { dismissSoundPrompt } = require("./fixtures/ui");
const fs = require("fs");
const path = require("path");

const SOCKET_CTRL = "http://127.0.0.1:6016";
const ROLE_COUNT = 10;
const RESULTS_PATH = path.join(
  __dirname,
  "test-results",
  "coin-roll-10-roles.json"
);

const ROLES = Array.from({ length: ROLE_COUNT }, (_, i) => {
  const n = i + 1;
  return {
    index: n,
    profile_id: 1000 + n,
    msisdn: `2547000000${String(n).padStart(2, "0")}`,
    display_name: `Role${n}`,
    token: `e2e-role-${n}`,
    cash_balance: 1000,
    bonus_balance: 0,
    balance: 1000,
    // Alternate HEADS / TAILS for coverage
    side: n % 2 === 1 ? "heads" : "tails",
  };
});

async function postCtrl(routePath, body = {}) {
  const res = await fetch(`${SOCKET_CTRL}${routePath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`socket ctrl ${routePath} failed: ${res.status}`);
  }
  return res.json();
}

async function getBets() {
  const res = await fetch(`${SOCKET_CTRL}/e2e/bets`);
  return res.json();
}

async function getStatus() {
  const res = await fetch(`${SOCKET_CTRL}/e2e/status`);
  return res.json();
}

/**
 * Serial 10-role coin roll:
 * open each role → place bet → keep sessions alive → flip → result.
 * Writes timings to e2e/test-results for the review canvas.
 */
test.describe("Coin roll — 10 roles serial", () => {
  test.describe.configure({ timeout: 240_000 });

  test("places bets serially then flips", async ({ browser }) => {
    const timeline = [];
    const mark = (role, step, ok, detail = "") => {
      timeline.push({
        at: Date.now(),
        role,
        step,
        ok,
        detail,
      });
    };

    await postCtrl("/e2e/waiting", { seconds_remaining: 180 });

    const contexts = [];
    const pages = [];

    try {
      for (const role of ROLES) {
        const t0 = Date.now();
        const context = await browser.newContext();
        const page = await context.newPage();
        contexts.push(context);
        pages.push(page);

        await seedLoggedInUser(page, role);
        await installSurecoinApiMocks(page, { session: role });

        await page.goto("/game");
        await dismissSoundPrompt(page);

        await expect(page.getByText(/choose heads or tails/i)).toBeVisible({
          timeout: 20_000,
        });

        const sideRe = role.side === "heads" ? /^heads$/i : /^tails$/i;
        await page.getByRole("button", { name: sideRe }).click();
        await expect(page.locator(".sc-confirm-btn")).toBeEnabled();
        await page.locator(".sc-confirm-btn").click();

        await expect(page.getByRole("button", { name: /confirmed/i })).toBeVisible({
          timeout: 15_000,
        });

        const elapsed = Date.now() - t0;
        mark(role.display_name, "place_bet", true, `${role.side} ${elapsed}ms`);
      }

      const mid = await getBets();
      expect(mid.bet_count).toBe(ROLE_COUNT);
      mark("server", "bet_count", mid.bet_count === ROLE_COUNT, `count=${mid.bet_count}`);

      // Observer: first role should see all live bets in the feed
      const observer = pages[0];
      await expect
        .poll(async () => observer.locator(".sc-bets-table tbody tr").count(), {
          timeout: 15_000,
        })
        .toBe(ROLE_COUNT);
      mark("Role1", "feed_count", true, `${ROLE_COUNT} rows`);

      await postCtrl("/e2e/flip-start", { flipSeconds: 2 });
      await expect(observer.getByText(/wait for next round/i)).toBeVisible({
        timeout: 15_000,
      });
      mark("server", "flip_start", true);

      await postCtrl("/e2e/result", { winningSide: "HEADS" });
      await expect(observer.locator(".sc-outcome-value")).toContainText(/heads/i, {
        timeout: 15_000,
      });
      mark("server", "result", true, "HEADS");

      // Odd roles (HEADS) should still show CONFIRMED / not back in choose mode
      for (let i = 0; i < pages.length; i += 1) {
        const role = ROLES[i];
        const page = pages[i];
        const chooseVisible = await page
          .getByText(/choose heads or tails/i)
          .isVisible()
          .catch(() => false);
        const outcome = await page.locator(".sc-outcome-value").innerText();
        const ok = !chooseVisible && /heads/i.test(outcome);
        mark(role.display_name, "post_result", ok, `outcome=${outcome}`);
        expect(ok, `${role.display_name} should see HEADS outcome`).toBeTruthy();
      }

      const status = await getStatus();
      const report = {
        generatedAt: new Date().toISOString(),
        roleCount: ROLE_COUNT,
        betCount: mid.bet_count,
        heads: mid.heads_count,
        tails: mid.tails_count,
        clientsAtEnd: status.clients,
        phase: status.phase,
        timeline,
        bets: mid.bets,
        flowsToFix: [
          {
            id: "reconnect-waiting",
            severity: "high",
            status: "fixed_in_mock",
            summary:
              "Mock used to re-emit round:waiting on connect → NEW_ROUND cleared myBet. Now uses round:sync like prod.",
          },
          {
            id: "single-lastBet",
            severity: "high",
            status: "fixed_in_mock",
            summary:
              "Mock overwrote one lastBet/bet_id=9001; multi-role needs bets[] + unique ids.",
          },
          {
            id: "bet-resolved-win-vs-won",
            severity: "medium",
            status: "open_prod",
            summary:
              "Backend bet:resolved may send `win` while UI reads `won` — win toasts can miss on live.",
          },
          {
            id: "soft-duplicate-no-reack",
            severity: "medium",
            status: "open_prod",
            summary:
              "If myBet cleared client-side but server already has bet, soft duplicate returns existing without re-broadcast; UI can stick unlocked.",
          },
          {
            id: "idempotency-datetime",
            severity: "low",
            status: "open_prod",
            summary:
              "idempotency_key includes Date.now() so retries are new keys; uniqueness relies on user+round constraint.",
          },
        ],
      };

      fs.mkdirSync(path.dirname(RESULTS_PATH), { recursive: true });
      fs.writeFileSync(RESULTS_PATH, JSON.stringify(report, null, 2));
    } finally {
      await Promise.all(contexts.map((c) => c.close().catch(() => {})));
    }
  });
});
