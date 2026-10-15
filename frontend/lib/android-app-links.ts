export function androidAppLinks(value: unknown) {
  if (typeof value !== "string") return [];
  const normalized = value.trim().toUpperCase();
  const fingerprint = /^[A-F0-9]{64}$/.test(normalized)
    ? normalized.match(/../g)!.join(":")
    : normalized;
  if (!/^(?:[A-F0-9]{2}:){31}[A-F0-9]{2}$/.test(fingerprint)) return [];
  return [{
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: "com.stoqo.app",
      sha256_cert_fingerprints: [fingerprint],
    },
  }];
}
