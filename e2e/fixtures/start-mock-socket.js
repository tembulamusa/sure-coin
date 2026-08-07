#!/usr/bin/env node
/**
 * Standalone entry for Playwright webServer (keeps socket mock alive).
 */
const {
  startMockSocketServer,
  SOCKET_PORT,
} = require("./mock-socket-server");

startMockSocketServer(SOCKET_PORT)
  .then(({ port }) => {
    // eslint-disable-next-line no-console
    console.log(`[e2e-mock-socket] listening on 127.0.0.1:${port}`);
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("[e2e-mock-socket] failed to start", err);
    process.exit(1);
  });

// Keep process alive
process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));
