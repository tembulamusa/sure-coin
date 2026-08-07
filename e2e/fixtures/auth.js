const { SESSION } = require("./mock-api");

/**
 * Seed the app's localStorage user shape: JSON { value: user }.
 * Must run before the app boots (addInitScript) or after clear + reload.
 */
async function seedLoggedInUser(page, user = SESSION) {
  await page.addInitScript((session) => {
    window.localStorage.setItem(
      "user",
      JSON.stringify({
        value: session,
      })
    );
  }, user);
}

async function clearAppStorage(page) {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
}

module.exports = {
  seedLoggedInUser,
  clearAppStorage,
};
