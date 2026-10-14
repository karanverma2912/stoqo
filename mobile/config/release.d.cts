export function resolveReleaseConfig(
  settings: { api_url: string; web_url: string },
  env?: Record<string, string | undefined>,
): { apiUrl?: string; webUrl?: string; projectId?: string; versionCode: number };
