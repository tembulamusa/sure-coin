const { test, expect } = require("@playwright/test");
const { installSurecoinApiMocks, SESSION } = require("./fixtures/mock-api");
const { seedLoggedInUser } = require("./fixtures/auth");
const { dismissSoundPrompt } = require("./fixtures/ui");

const SOCKET_CTRL = "http://127.0.0.1:6016";

async function postCtrl(path, body = {}) {
  const res = await fetch(`${SOCKET_CTRL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`socket ctrl ${path} failed: ${res.status}`);
  }
  return res.json();
}

async function getLastBet() {
  const res = await fetch(`${SOCKET_CTRL}/e2e/last-bet`);
  const data = await res.json();
  return data.lastBet;
}

test.describe("Coin roll", () => {
  test.beforeEach(async ({ page }) => {
    await seedLoggedInUser(page, {
      ...SESSION,
      balance: 1000,
      cash_balance: 1000,
    });
    await installSurecoinApiMocks(page, {
      session: { ...SESSION, balance: 1000, cash_balance: 1000 },
    });
    // Reset mock round so prior specs / reconnects do not leak phase
    await postCtrl("/e2e/waiting", { seconds_remaining: 120 });
  });

  test("places HEADS bet then simulates flip and result", async ({ page }) => {
    await page.goto("/game");
    await dismissSoundPrompt(page);

    await postCtrl("/e2e/waiting", { seconds_remaining: 120 });

    await expect(page.getByText(/choose heads or tails/i)).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("button", { name: /^heads$/i }).click();
    await expect(page.locator(".sc-confirm-btn")).toBeEnabled();
    await page.locator(".sc-confirm-btn").click();

    await expect
      .poll(async () => (await getLastBet())?.coin_side, { timeout: 10_000 })
      .toBe("HEADS");

    await expect(page.getByRole("button", { name: /confirmed/i })).toBeVisible({
      timeout: 10_000,
    });

    await postCtrl("/e2e/flip-start", { flipSeconds: 2 });

    await expect(page.getByText(/choose heads or tails/i)).toBeHidden({
      timeout: 10_000,
    });
    await expect(page.getByText(/wait for next round/i)).toBeVisible();

    await postCtrl("/e2e/result", { winningSide: "HEADS" });

    await expect(page.locator(".sc-outcome-value")).toContainText(/heads/i, {
      timeout: 15_000,
    });
    // Still confirmed / result phase — not wiped by a reconnect WAITING
    await expect(page.getByText(/choose heads or tails/i)).toBeHidden();
  });
});
