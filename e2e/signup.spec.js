const { test, expect } = require("@playwright/test");
const { installSurecoinApiMocks, SESSION } = require("./fixtures/mock-api");
const { clearAppStorage } = require("./fixtures/auth");

test.describe("Signup", () => {
  test.beforeEach(async ({ page }) => {
    await clearAppStorage(page);
    await installSurecoinApiMocks(page);
  });

  test("registers and lands on game with token stored", async ({ page }) => {
    await page.goto("/signup");

    await page.locator("#msisdn").fill("0705182016");
    await page.locator("#password").fill("secret12");
    await page.locator("#password2").fill("secret12");

    const responsePromise = page.waitForResponse(
      (res) =>
        res.url().includes("auth/signup") && res.request().method() === "POST",
      { timeout: 20_000 }
    );

    await page.getByRole("button", { name: /^signup$/i }).click();

    const response = await responsePromise;
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body?.data?.token).toBe(SESSION.token);

    await expect(page).toHaveURL(/\/game/, { timeout: 20_000 });

    const stored = await page.evaluate(() => {
      const raw = window.localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    });
    expect(stored?.value?.token).toBe(SESSION.token);
    await expect(page.getByText(/balance/i).first()).toBeVisible();
  });
});
