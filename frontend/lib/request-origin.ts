type OriginEnvironment = { WEB_URL?: string; RENDER_EXTERNAL_URL?: string };

export function isSameOriginRequest(
  requestOrigin: string,
  origin: string | null,
  env: OriginEnvironment = {
    WEB_URL: process.env.WEB_URL,
    RENDER_EXTERNAL_URL: process.env.RENDER_EXTERNAL_URL,
  },
): boolean {
  if (!origin) return false;
  try {
    const publicOrigin = new URL(env.WEB_URL || env.RENDER_EXTERNAL_URL || requestOrigin).origin;
    return origin === publicOrigin;
  } catch {
    return false;
  }
}
