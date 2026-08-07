const { test, expect } = require("@playwright/test");
const { installSurecoinApiMocks, SESSION } = require("./fixtures/mock-api");
const { clearAppStorage } = require("./fixtures/auth");
const { dismissSoundPrompt } = require("./fixtures/ui");

test.describe("Login", () => {
  test.beforeEach(async ({ page }) => {
    await clearAppStorage(page);
    await installSurecoinApiMocks(page);
  });

  test("logs in from game header and shows balance", async ({ page }) => {
    await page.goto("/game");
    await dismissSoundPrompt(page);

    await page.getByRole("button", { name: /^login$/i }).click();
    await expect(page.locator("#sc-login-msisdn")).toBeVisible();

    await page.locator("#sc-login-msisdn").fill("0705182016");
    await page.locator("#sc-login-password").fill("secret12");

    const responsePromise = page.waitForResponse(
      (res) =>
        res.url().includes("auth/login") && res.request().method() === "POST",
      { timeout: 20_000 }
    );
    await page.locator(".sc-login-btn--primary").click();
    await responsePromise;

    await expect(page.locator("#sc-login-msisdn")).toHaveCount(0, {
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: /my account/i })).toBeVisible();
    await expect(page.locator(".sc-balance-value")).toContainText("500");

    const stored = await page.evaluate(() => {
      const raw = window.localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    });
    expect(stored?.value?.token).toBe(SESSION.token);
    expect(stored?.value?.balance).toBe(SESSION.balance);
  });
});
