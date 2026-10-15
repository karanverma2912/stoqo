import { describe, expect, it } from "vitest";
import { authValidationDetails, signupErrors } from "./auth-validation";

const values = { name: "A shop owner", email: "owner@example.invalid", password: "twelve-chars" };

describe("Signup field validation", () => {
  it("puts the short-password error only on the password field", () => {
    expect(signupErrors({ ...values, password: "short" })).toEqual({ password: "Password must be at least 12 characters." });
    expect(signupErrors({ ...values, password: "a".repeat(11) }).password).toBeTruthy();
    expect(signupErrors({ ...values, password: "a".repeat(12) })).toEqual({});
  });
  it("validates empty fields without trimming the entered password", () => {
    expect(signupErrors({ name: "  ", email: "", password: "" })).toEqual({ name: "Enter your name.", email: "Enter your email.", password: "Enter your password." });
    expect(signupErrors({ ...values, password: " twelve word" })).toEqual({});
  });
  it("counts Unicode characters and enforces the server's BCrypt byte limit", () => {
    expect(signupErrors({ ...values, password: "😀".repeat(6) }).password).toContain("12 characters");
    expect(signupErrors({ ...values, password: "😀".repeat(12) })).toEqual({});
    expect(signupErrors({ ...values, password: "a".repeat(72) })).toEqual({});
    expect(signupErrors({ ...values, password: "a".repeat(73) }).password).toContain("too long");
    expect(signupErrors({ ...values, password: "😀".repeat(19) }).password).toContain("too long");
  });
  it("places the API's validation details beside the matching inputs", () => {
    expect(authValidationDetails({ password: ["is too short (minimum is 12 characters)"] })).toEqual({ fields: { password: "Password is too short (minimum is 12 characters)" }, message: "" });
    expect(authValidationDetails({ name: ["can't be blank"], email: ["is invalid"] }).fields).toEqual({ name: "Name can't be blank", email: "Email is invalid" });
  });
  it("explains an existing email and maps password confirmation to its input", () => {
    const result = authValidationDetails({ email: ["has already been taken"], password_confirmation: ["doesn't match Password"] });
    expect(result.fields.email).toBe("This email already has an account. Sign in instead.");
    expect(result.fields.password).toBe("Password confirmation doesn't match Password");
  });
  it("keeps non-field errors visible instead of discarding them", () => {
    expect(authValidationDetails({ base: ["Please try again later"] })).toEqual({ fields: {}, message: "Please try again later" });
    expect(authValidationDetails({})).toEqual({ fields: {}, message: "" });
  });
});
