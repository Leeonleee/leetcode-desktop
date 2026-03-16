export type Domain = "com" | "cn";

export function normalizeDomain(value: unknown): Domain {
  return value === "cn" ? "cn" : "com";
}
