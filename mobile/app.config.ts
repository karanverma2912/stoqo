import type { ExpoConfig } from "expo/config";
import settings from "./production.json";
import fontLicenses from "./assets/licenses/fonts.json";
import { resolveReleaseConfig } from "./config/release.cjs";
const {
  apiUrl,
  webUrl: web,
  projectId,
  versionCode,
} = resolveReleaseConfig(settings);
const webHost = web ? new URL(web).hostname : undefined;
const config: ExpoConfig = {
  name: "Stoqo",
  slug: "stoqo",
  owner: "karanverma2912",
  version: "0.3.2",
  scheme: "stoqo",
  orientation: "default",
  userInterfaceStyle: "automatic",
  icon: "./assets/stoqo-icon.png",
  ios: {
    bundleIdentifier: "com.stoqo.app",
    buildNumber: "5",
    supportsTablet: true,
    ...(webHost ? { associatedDomains: [`applinks:${webHost}`] } : {}),
  },
  android: {
    package: "com.stoqo.app",
    versionCode,
    adaptiveIcon: {
      foregroundImage: "./assets/stoqo-adaptive.png",
      backgroundColor: "#D5F887",
    },
    ...(process.env.GOOGLE_SERVICES_JSON
      ? { googleServicesFile: process.env.GOOGLE_SERVICES_JSON }
      : {}),
    ...(webHost
      ? {
          intentFilters: [
            {
              action: "VIEW",
              autoVerify: true,
              category: ["BROWSABLE", "DEFAULT"],
              data: [
                { scheme: "https", host: webHost, pathPrefix: "/join" },
                { scheme: "https", host: webHost, pathPrefix: "/verify" },
                {
                  scheme: "https",
                  host: webHost,
                  pathPrefix: "/reset-password",
                },
              ],
            },
          ],
        }
      : {}),
  },
  plugins: [
    "expo-router",
    "expo-font",
    [
      "expo-splash-screen",
      {
        image: "./assets/stoqo-splash.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#F5F5F0",
        dark: {
          image: "./assets/stoqo-splash-dark.png",
          backgroundColor: "#0A1610",
        },
      },
    ],
    "expo-secure-store",
    [
      "expo-camera",
      {
        cameraPermission: "Allow Stoqo to scan product barcodes.",
        recordAudioAndroid: false,
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission:
          "Allow Stoqo to choose product photos and barcode images.",
      },
    ],
    [
      "expo-notifications",
      { icon: "./assets/stoqo-notification.png", color: "#174B32" },
    ],
    [
      "expo-speech-recognition",
      {
        microphonePermission:
          "Allow Stoqo to turn your voice into an editable question.",
        speechRecognitionPermission:
          "Allow Stoqo to recognize your spoken questions.",
      },
    ],
  ],
  // Only public connection information is embedded in native builds.
  extra: {
    apiUrl,
    webUrl: web,
    fontLicenses,
    androidPushConfigured: !!process.env.GOOGLE_SERVICES_JSON,
    ...(projectId ? { eas: { projectId } } : {}),
  },
  updates: { enabled: false },
  experiments: { typedRoutes: false },
  web: {
    bundler: "metro",
    output: "single",
    favicon: "./assets/stoqo-icon.png",
  },
};
export default config;
