// Public API readiness only. No store data, credentials, or write requests.
const target = "https://stoqo-api.onrender.com/ready";

export async function checkApi() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  const started = Date.now();
  try {
    const response = await fetch(target, {
      signal: controller.signal,
      redirect: "error",
      headers: { Accept: "application/json", "User-Agent": "Stoqo-Health/1.0" },
      cf: { cacheTtl: 0, cacheEverything: false },
    });
    // The readiness response is a small fixed document. Cancel instead of
    // buffering error pages from a proxy or sleeping origin.
    const status = response.status;
    await response.body?.cancel();
    console.log(JSON.stringify({ event: "stoqo_api_health", ok: status === 200, status, duration_ms: Date.now() - started }));
    if (status !== 200) throw new Error(`API health check returned ${status}`);
  } catch (error) {
    console.error(JSON.stringify({ event: "stoqo_api_health_failed", duration_ms: Date.now() - started }));
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export default {
  // Await the read so a failed check is visible as a failed scheduled event.
  async scheduled() { await checkApi(); },
  // HTTP callers cannot trigger health checks or choose an arbitrary target.
  async fetch() { return new Response("Not found", { status: 404 }); },
};
