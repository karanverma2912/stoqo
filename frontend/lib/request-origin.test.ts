import { describe, expect, it } from "vitest";
import { isSameOriginRequest } from "./request-origin";

describe("website request origins behind the hosting proxy", () => {
  const internal = "http://localhost:10000";
  const render = { RENDER_EXTERNAL_URL: "https://stoqo-web.onrender.com" };

  it("accepts the browser's public HTTPS origin when the upstream request is HTTP", () => {
    expect(isSameOriginRequest(internal, "https://stoqo-web.onrender.com", render)).toBe(true);
  });

  it("rejects foreign, missing and internal origins on the deployed website", () => {
    for (const origin of ["https://attacker.example", "http://stoqo-web.onrender.com", internal, null, "null"]) {
      expect(isSameOriginRequest(internal, origin, render)).toBe(false);
    }
  });

  it("uses an explicitly configured custom domain as the sole trusted origin", () => {
    const env = { ...render, WEB_URL: "https://stock.example.com/" };
    expect(isSameOriginRequest(internal, "https://stock.example.com", env)).toBe(true);
    expect(isSameOriginRequest(internal, render.RENDER_EXTERNAL_URL, env)).toBe(false);
  });

  it("keeps local development same-origin when no public URL is configured", () => {
    expect(isSameOriginRequest("http://localhost:3000", "http://localhost:3000", {})).toBe(true);
    expect(isSameOriginRequest("http://localhost:3000", "http://localhost:3001", {})).toBe(false);
  });

  it("rejects requests when the configured public URL is invalid", () => {
    expect(isSameOriginRequest(internal, internal, { WEB_URL: "invalid" })).toBe(false);
  });
});
