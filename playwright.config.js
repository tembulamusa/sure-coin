// @ts-check
const { defineConfig, devices } = require("@playwright/test");

const PORT = 3010;
const BASE_URL = `http://127.0.0.1:${PORT}`;

/**
 * Playwright e2e against a local CRA server with mocked SureCoin REST.
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm start",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      ...process.env,
      PORT: String(PORT),
      BROWSER: "none",
      DISABLE_ESLINT_PLUGIN: "true",
      ESLINT_NO_DEV_ERRORS: "true",
      // Override .env.local so auto-login does not poison auth e2e
      REACT_APP_LOCAL_SIM: "false",
      REACT_APP_SURECOIN_PUBLIC_URL: "http://127.0.0.1:6005/v1/surecoin/",
      REACT_APP_SURECOIN_URL: "http://127.0.0.1:6005/v1/surecoin/user/",
      REACT_APP_SURECOIN_SOCKET_URL: "http://127.0.0.1:6006",
      REACT_APP_SOCKET_URL: "",
    },
  },
});
