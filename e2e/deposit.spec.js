const { test, expect } = require("@playwright/test");
const { installSurecoinApiMocks, SESSION } = require("./fixtures/mock-api");
const { seedLoggedInUser } = require("./fixtures/auth");
const { dismissSoundPrompt } = require("./fixtures/ui");

test.describe("Deposit", () => {
  test.beforeEach(async ({ page }) => {
    await seedLoggedInUser(page, SESSION);
    await installSurecoinApiMocks(page, { session: SESSION });
  });

  test("deposits from account drawer and updates balance", async ({ page }) => {
    await page.goto("/game");
    await dismissSoundPrompt(page);

    await expect(page.getByRole("button", { name: /my account/i })).toBeVisible();
    await page.getByRole("button", { name: /my account/i }).click();

    await page.locator(".sc-acct-btn--deposit").click();

    const amount = page.getByPlaceholder(/enter amount/i);
    await expect(amount).toBeVisible();
    await amount.fill("50");

    const responsePromise = page.waitForResponse(
      (res) =>
        res.url().includes("user/deposit") && res.request().method() === "POST",
      { timeout: 20_000 }
    );
    await page.locator('button[type="submit"]').click();
    await responsePromise;

    await expect(page.getByText(/deposit successful/i)).toBeVisible();

    await expect
      .poll(async () => {
        const raw = await page.evaluate(() => window.localStorage.getItem("user"));
        return raw ? JSON.parse(raw).value.balance : null;
      })
      .toBe(SESSION.balance + 50);
  });
});
