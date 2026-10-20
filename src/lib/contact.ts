import { config } from "../config/env";

export interface CountryCode {
  label: string;
  value: string;
}

/** Country codes offered in phone fields. Extend as needed. */
export const COUNTRY_CODES: CountryCode[] = [
  { label: "IN +91", value: "+91" },
  { label: "US +1", value: "+1" },
  { label: "UK +44", value: "+44" },
  { label: "AE +971", value: "+971" },
  { label: "SG +65", value: "+65" },
  { label: "AU +61", value: "+61" },
  { label: "DE +49", value: "+49" },
];

export const DEFAULT_COUNTRY_CODE = COUNTRY_CODES.some((c) => c.value === config.defaultCountryCode)
  ? config.defaultCountryCode
  : "+91";

export const digitsOnly = (value: string) => value.replace(/\D/g, "");

/** Combine a country code and a local number into E.164, e.g. "+91" + "98765 43210" → "+919876543210". */
export function toE164(countryCode: string, localNumber: string): string {
  const digits = digitsOnly(localNumber).replace(/^0+/, "");
  return digits ? `${countryCode}${digits}` : "";
}

/** E.164: "+", then 8–15 digits, first digit not 0. */
export function isValidE164(value: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(value);
}

export function isValidLocalNumber(countryCode: string, localNumber: string): boolean {
  return isValidE164(toE164(countryCode, localNumber));
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export type IdentifierKind = "email" | "phone";

/**
 * Normalise a login identifier. Emails are trimmed and lower-cased; phone
 * numbers become E.164 (the default country code is added when missing).
 * Returns null when the value is neither a valid email nor a valid phone.
 */
export function normalizeIdentifier(raw: string): { kind: IdentifierKind; value: string } | null {
  const value = raw.trim();
  if (!value) return null;
  if (value.includes("@")) {
    return isEmail(value) ? { kind: "email", value: value.toLowerCase() } : null;
  }
  const hasPlus = value.startsWith("+");
  const digits = digitsOnly(value);
  const e164 = hasPlus ? `+${digits}` : toE164(DEFAULT_COUNTRY_CODE, digits);
  return isValidE164(e164) ? { kind: "phone", value: e164 } : null;
}

/** j***@example.com */
export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  return `${user[0]}***@${domain}`;
}

/** +91 ******3210 */
export function maskPhone(phone: string): string {
  const digits = digitsOnly(phone);
  if (digits.length <= 4) return phone;
  return `+${"*".repeat(digits.length - 4)}${digits.slice(-4)}`;
}

export function maskIdentifier(value: string): string {
  return value.includes("@") ? maskEmail(value) : maskPhone(value);
}

/** "SHIPPER_ADMIN" → "Shipper admin" */
export function humanizeCode(code: string): string {
  const words = code.toLowerCase().split(/[_\s]+/).filter(Boolean);
  if (!words.length) return code;
  const text = words.join(" ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
