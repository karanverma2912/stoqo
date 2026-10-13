import { describe, expect, it } from "vitest";
import { tokenFromLink, validToken } from "./link-token";
const token = "a_test_invitation_with_43_characters_12345678";
describe("Invitation link handoff", () => {
  it("preserves a token in a website fragment without putting it in the request query", () => {
    const link = `https://stoqo.example/join#token=${token}`;
    expect(tokenFromLink(link)).toBe(token);
    expect(new URL(link).search).toBe("");
  });
  it("accepts the native app link format", () => {
    expect(tokenFromLink(`stoqo://join#token=${token}`)).toBe(token);
  });
  it("rejects malformed invitation tokens", () => {
    expect(validToken(token)).toBe(true);
    expect(validToken("short")).toBe(false);
    expect(validToken("../secret?token=anything")).toBe(false);
  });
});
