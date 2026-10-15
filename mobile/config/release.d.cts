export function resolveReleaseConfig(
  settings: { api_url: string; web_url: string; eas_project_id?: string },
  env?: Record<string, string | undefined>,
): { apiUrl?: string; webUrl?: string; projectId?: string; versionCode: number };
