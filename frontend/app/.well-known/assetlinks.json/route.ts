import { androidAppLinks } from "@/lib/android-app-links";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(androidAppLinks(process.env.ANDROID_RELEASE_CERT_SHA256));
}
