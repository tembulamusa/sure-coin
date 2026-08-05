// #region agent log
export const dbgLog = (location, message, data, hypothesisId) => {
  fetch("http://127.0.0.1:7274/ingest/6e270618-3295-4780-92b9-7cd234beb521", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "658538",
    },
    body: JSON.stringify({
      sessionId: "658538",
      location,
      message,
      data,
      hypothesisId,
      runId: "post-fix-v2",
      timestamp: Date.now(),
    }),
  }).catch(() => {});
};
// #endregion
