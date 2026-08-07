async function dismissSoundPrompt(page) {
  const cover = page.locator(".sound-interact-prompt-cover");
  try {
    await cover.waitFor({ state: "visible", timeout: 5_000 });
  } catch (_) {
    return;
  }
  await cover.getByRole("button", { name: /^no$/i }).click();
  await cover.waitFor({ state: "detached", timeout: 10_000 });
}

module.exports = { dismissSoundPrompt };
