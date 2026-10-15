import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { resolveReleaseConfig } from "../config/release.cjs";

const settings = { api_url: "https://stoqo-api.onrender.com", web_url: "https://stoqo-web.onrender.com" };

describe("APK release configuration", () => {
  it("uses the same checked-in origins for EAS and local release checks", () => {
    for (const env of [{ EAS_BUILD_PROFILE: "apk" }, { STOQO_RELEASE_BUILD: "true" }]) {
      expect(resolveReleaseConfig(settings, env)).toMatchObject({ apiUrl: settings.api_url, webUrl: settings.web_url });
    }
  });
  it("refuses to build an APK with missing, private, placeholder or insecure origins", () => {
    expect(() => resolveReleaseConfig({ api_url: "", web_url: "" }, { EAS_BUILD_PROFILE: "apk" })).toThrow("live API");
    for (const api_url of ["http://stoqo-api.onrender.com", "https://localhost", "https://192.168.1.3", "https://api.example.com", "https://your-stoqo-api.onrender.com", "https://api.example.invalid", "https://host/path", "https://name:password@host", "https://host?token=sensitive"]) {
      expect(() => resolveReleaseConfig({ ...settings, api_url }, { EAS_BUILD_PROFILE: "production" })).toThrow();
    }
  });
  it("keeps local HTTP development available and excludes server secrets", () => {
    const result = resolveReleaseConfig(settings, {
      EXPO_PUBLIC_API_URL: "http://192.168.1.3:3001", GEMINI_API_KEY: "server-only-test-key", SECRET_KEY_BASE: "server-only-test-secret",
    });
    expect(result.apiUrl).toBe("http://192.168.1.3:3001");
    expect(JSON.stringify(result)).not.toContain("server-only");
  });
  it("preserves project linking across build machines and validates overrides", () => {
    const projectId = "9e120832-9a9c-487a-9de5-f479f66dcce2";
    const override = "b3026072-71ab-4e5c-80a7-34e678d7e778";
    expect(resolveReleaseConfig({ ...settings, eas_project_id: projectId }, {}).projectId).toBe(projectId);
    expect(resolveReleaseConfig({ ...settings, eas_project_id: projectId }, { EXPO_PUBLIC_EAS_PROJECT_ID: override }).projectId).toBe(override);
    expect(() => resolveReleaseConfig({ ...settings, eas_project_id: "invalid" }, {})).toThrow("UUID");
  });
  it("embeds matching origins and app links in the actual Expo public manifest", () => {
    const mobile = fileURLToPath(new URL("../", import.meta.url));
    const stdout = execFileSync(process.execPath, ["-e", "console.log(JSON.stringify(require('@expo/config').getConfig(process.cwd()).exp))"], {
      cwd: mobile,
      env: {
        ...process.env, STOQO_RELEASE_BUILD: "true", EXPO_PUBLIC_API_URL: settings.api_url,
        EXPO_PUBLIC_WEB_URL: settings.web_url, ANDROID_VERSION_CODE: "104",
        GEMINI_API_KEY: "server-only-test-key", SECRET_KEY_BASE: "server-only-test-secret",
      },
      encoding: "utf8",
    });
    const config = JSON.parse(stdout);
    const production = JSON.parse(readFileSync(new URL("../production.json", import.meta.url), "utf8"));
    expect(config.extra.apiUrl).toBe(settings.api_url);
    expect(config.extra.webUrl).toBe(settings.web_url);
    expect(config.android.versionCode).toBe(104);
    expect(config.extra.eas.projectId).toBe(process.env.EXPO_PUBLIC_EAS_PROJECT_ID || production.eas_project_id);
    expect(config.android.intentFilters[0].data[0].host).toBe("stoqo-web.onrender.com");
    expect(stdout).not.toContain("server-only");
  });
});
