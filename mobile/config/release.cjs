function origin(value, release) {
  if (!value) return undefined;
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/" ||
    !["https:", "http:"].includes(url.protocol))
    throw new Error("Stoqo URLs must be plain server origins without paths or credentials.");
  if (release) {
    const host = url.hostname.toLowerCase();
    const privateHost = host === "localhost" || host === "[::1]" ||
      /^(?:0\.|10\.|127\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(host);
    const placeholder = /\.(?:invalid|example|test|localhost|local)$/.test(host) ||
      /^(?:your-|YOUR-)/i.test(host) || host === "example.com" || host.endsWith(".example.com");
    if (url.protocol !== "https:" || privateHost || placeholder)
      throw new Error("Release builds need the live public HTTPS API and website origins.");
  }
  return url.origin;
}

function resolveReleaseConfig(settings, env = process.env) {
  const release = env.STOQO_RELEASE_BUILD === "true" ||
    ["preview", "apk", "production"].includes(env.EAS_BUILD_PROFILE);
  const apiUrl = origin(env.EXPO_PUBLIC_API_URL || settings.api_url, release);
  const webUrl = origin(env.EXPO_PUBLIC_WEB_URL || settings.web_url, release);
  if (release && (!apiUrl || !webUrl))
    throw new Error("Set the live API and website origins in mobile/production.json or EXPO_PUBLIC_API_URL/EXPO_PUBLIC_WEB_URL before building an APK.");
  const versionCode = Number(env.ANDROID_VERSION_CODE ?? 3);
  if (!Number.isSafeInteger(versionCode) || versionCode < 1 || versionCode > 2100000000)
    throw new Error("ANDROID_VERSION_CODE must be a positive Android version number.");
  const projectId = env.EXPO_PUBLIC_EAS_PROJECT_ID || settings.eas_project_id || undefined;
  if (projectId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId))
    throw new Error("EXPO_PUBLIC_EAS_PROJECT_ID must be the Expo project's UUID.");
  return { apiUrl, webUrl, versionCode, projectId };
}

module.exports = { resolveReleaseConfig };
