const fs = require('fs');
const path = require('path');
const settings = require('../mobile/production.json');
const { resolveReleaseConfig } = require('../mobile/config/release.cjs');
const version = process.env.GITHUB_ENV
  ? String(100 + Number(process.env.ANDROID_VERSION_CODE ?? 3))
  : process.env.ANDROID_VERSION_CODE;
const config = resolveReleaseConfig(settings, {
  ...process.env, STOQO_RELEASE_BUILD: 'true', ANDROID_VERSION_CODE: version,
});
if (process.env.GITHUB_ENV) {
  const vars = {
    EXPO_PUBLIC_API_URL: config.apiUrl, EXPO_PUBLIC_WEB_URL: config.webUrl,
    ANDROID_VERSION_CODE: String(config.versionCode), STOQO_RELEASE_BUILD: 'true',
  };
  if (config.projectId) vars.EXPO_PUBLIC_EAS_PROJECT_ID = config.projectId;
  if (process.env.GOOGLE_SERVICES_JSON_BASE64) {
    const file = path.resolve(__dirname, '../mobile/google-services.json');
    fs.writeFileSync(file, Buffer.from(process.env.GOOGLE_SERVICES_JSON_BASE64, 'base64'));
    vars.GOOGLE_SERVICES_JSON = file;
  }
  fs.appendFileSync(process.env.GITHUB_ENV, Object.entries(vars).map(([k, v]) => `${k}=${v}\n`).join(''));
}
console.log('Release connection configuration is valid. No APK was built.');
