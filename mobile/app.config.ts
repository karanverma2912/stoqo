import type { ExpoConfig } from "expo/config";
const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
const web = process.env.EXPO_PUBLIC_WEB_URL;
const webHost = web ? new URL(web).hostname : undefined;
const config: ExpoConfig = {
  name: "Stoqo",
  slug: "stoqo",
  version: "0.3.0",
  scheme: "stoqo",
  orientation: "default",
  userInterfaceStyle: "automatic",
  icon: "./assets/stoqo-icon.png",
  ios: {
    bundleIdentifier: "com.stoqo.app",
    buildNumber: "3",
    supportsTablet: true,
    ...(webHost ? { associatedDomains: [`applinks:${webHost}`] } : {}),
  },
  android: {
    package: "com.stoqo.app",
    versionCode: Number(process.env.ANDROID_VERSION_CODE ?? 3),
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
  extra: { ...(projectId ? { eas: { projectId } } : {}) },
  updates: { enabled: false },
  experiments: { typedRoutes: false },
  web: {
    bundler: "metro",
    output: "single",
    favicon: "./assets/stoqo-icon.png",
  },
};
export default config;
