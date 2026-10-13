export function tokenFromLink(url: string) {
  const parsed = new URL(url);
  return (
    new URLSearchParams(parsed.hash.slice(1)).get("token") ??
    parsed.searchParams.get("token") ??
    ""
  );
}
export function validToken(token: string) {
  return /^[a-zA-Z0-9_-]{30,100}$/.test(token);
}
