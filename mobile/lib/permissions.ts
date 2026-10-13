import type { Business } from "./types";
export function permissions(role?: Business["role"]) {
  return {
    stock: !!role,
    write: ["owner", "admin", "manager"].includes(role ?? ""),
    manage: ["owner", "admin"].includes(role ?? ""),
    costs: ["owner", "admin"].includes(role ?? ""),
  };
}
