export type AuthField = "name" | "email" | "password";
export type AuthFieldErrors = Partial<Record<AuthField, string>>;
type SignupValues = Record<AuthField, string>;

export function signupErrors(values: SignupValues): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  if (!values.name.trim()) errors.name = "Enter your name.";
  if (!values.email.trim()) errors.email = "Enter your email.";
  if (!values.password) errors.password = "Enter your password.";
  else if (Array.from(values.password).length < 12)
    errors.password = "Password must be at least 12 characters.";
  else {
    // BCrypt limits passwords by UTF-8 bytes, including non-ASCII characters.
    const bytes = Array.from(values.password).reduce((total, character) => {
      const point = character.codePointAt(0)!;
      return total + (point < 0x80 ? 1 : point < 0x800 ? 2 : point < 0x10000 ? 3 : 4);
    }, 0);
    if (bytes > 72)
      errors.password = "Password is too long. Use fewer characters.";
  }
  return errors;
}

export function authValidationDetails(details: Record<string, string[]>) {
  const fields: AuthFieldErrors = {};
  const other: string[] = [];
  for (const [attribute, values] of Object.entries(details)) {
    if (!Array.isArray(values)) continue;
    const messages = values.filter((value) => typeof value === "string" && value.trim());
    if (!messages.length) continue;
    const field: AuthField | undefined =
      attribute === "password_confirmation" ? "password" :
        attribute === "name" || attribute === "email" || attribute === "password"
          ? attribute : undefined;
    const label = attribute.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
    const message = field === "email" && messages.includes("has already been taken")
      ? "This email already has an account. Sign in instead."
      : messages.map((value) => attribute === "base" ? value : `${label} ${value}`).join(". ");
    if (field) fields[field] = [fields[field], message].filter(Boolean).join(" ");
    else other.push(message);
  }
  return { fields, message: other.join(" ") };
}
