/**
 * Playwright helpers to mock SureCoin REST via page.route.
 * Specific routes are registered last so they win over any fallbacks
 * (Playwright matches in reverse registration order).
 */

const SESSION = {
  profile_id: 99,
  msisdn: "254705182016",
  display_name: "E2E Player",
  token: "e2e-test-jwt",
  cash_balance: 500,
  bonus_balance: 0,
  balance: 500,
};

async function fulfillJson(route, body, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function installSurecoinApiMocks(page, { session = SESSION } = {}) {
  // Generic surecoin REST fallback FIRST (matched last)
  await page.route("**/v1/surecoin/**", async (route) => {
    const url = route.request().url();
    if (
      url.includes("/auth/") ||
      url.includes("/user/deposit") ||
      url.includes("/user/withdraw") ||
      url.includes("/user/balance") ||
      url.includes("/config")
    ) {
      await route.fallback();
      return;
    }
    await fulfillJson(route, { status: 200, data: [] });
  });

  await page.route("**/v1/surecoin/config**", async (route) => {
    await fulfillJson(route, {
      min_bet_amount: 5,
      payout_multiplier: 2,
      round_wait_seconds: 6,
      round_flip_seconds: 5,
      round_result_seconds: 2,
    });
  });

  await page.route("**/v1/surecoin/user/balance", async (route) => {
    await fulfillJson(route, {
      cash: session.cash_balance,
      bonus: session.bonus_balance,
      total: session.balance,
    });
  });

  await page.route("**/v1/surecoin/user/deposit", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    let amount = 50;
    try {
      amount = Number(route.request().postDataJSON()?.amount) || 50;
    } catch (_) {
      /* ignore */
    }
    const cash = (session.cash_balance || 0) + amount;
    await fulfillJson(route, {
      status: 200,
      message: "Deposit successful",
      cash,
      bonus: session.bonus_balance || 0,
      total: cash + (session.bonus_balance || 0),
      reference: "DEP-E2E",
    });
  });

  await page.route("**/v1/surecoin/user/withdraw", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    let amount = 50;
    try {
      amount = Number(route.request().postDataJSON()?.amount) || 50;
    } catch (_) {
      /* ignore */
    }
    const cash = Math.max(0, (session.cash_balance || 0) - amount);
    await fulfillJson(route, {
      status: 200,
      message: "Withdrawal successful",
      cash,
      bonus: session.bonus_balance || 0,
      total: cash + (session.bonus_balance || 0),
      reference: "WDR-E2E",
    });
  });

  // Auth last so they take precedence
  await page.route("**/v1/surecoin/auth/signup", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    await fulfillJson(route, { status: 200, data: { ...session } });
  });

  await page.route("**/v1/surecoin/auth/login", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    await fulfillJson(route, { status: 200, data: { ...session } });
  });
}

module.exports = {
  SESSION,
  installSurecoinApiMocks,
  fulfillJson,
};
