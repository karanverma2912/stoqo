// Server-only configuration. Never expose infrastructure URLs in NEXT_PUBLIC vars.
export function apiOrigin() {
  return (process.env.API_URL ||
    (process.env.API_HOST
      ? `http://${process.env.API_HOST}:${process.env.API_PORT || "10000"}`
      : "http://localhost:3001")).replace(/\/$/, "");
}
