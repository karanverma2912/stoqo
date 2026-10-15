import { describe, expect, it } from "vitest";
import { androidAppLinks } from "./android-app-links";

describe("Android app-link signing identity", () => {
  const fingerprint = Array(32).fill("AB").join(":");

  it("advertises the configured signing certificate for the Stoqo Android package", () => {
    expect(androidAppLinks(fingerprint.toLowerCase())).toEqual([{
      relation: ["delegate_permission/common.handle_all_urls"],
      target: { namespace: "android_app", package_name: "com.stoqo.app", sha256_cert_fingerprints: [fingerprint] },
    }]);
  });

  it("accepts the unseparated SHA-256 format from signing tools", () => {
    expect(androidAppLinks("ab".repeat(32))[0].target.sha256_cert_fingerprints).toEqual([fingerprint]);
  });

  it("publishes no association for missing or malformed certificate fingerprints", () => {
    for (const value of [undefined, null, {}, 123, "", "AB".repeat(31), "ZZ".repeat(32), fingerprint + ":AB", "A:B".repeat(32)]) {
      expect(androidAppLinks(value)).toEqual([]);
    }
  });
});
