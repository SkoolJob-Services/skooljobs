import type { SignupSessionRequest } from "../../api/types";
import { isEmail, isValidLocalNumber, toE164 } from "../../lib/contact";
import type { Channel } from "../tenant/otpChannels";

export type OtpChannel = "email" | "phone" | "whatsapp";

export interface SignupFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phoneCountryCode: string;
  phoneNumber: string;
  whatsappSameAsPhone: boolean;
  whatsappCountryCode: string;
  whatsappNumber: string;
  signupType: string;
  verifyEmail: boolean;
  verifyPhone: boolean;
  verifyWhatsapp: boolean;
}

export type SignupFieldErrors = Partial<Record<keyof SignupFormValues | "form", string>>;

export interface SignupContact {
  email?: string;
  phone?: string;
  whatUpNo?: string;
}

/** Contact values as the API expects them (email trimmed and lowercase, E.164), empty ones omitted. */
export function contactFromForm(v: SignupFormValues): SignupContact {
  const email = v.email.trim().toLowerCase();
  const phone = toE164(v.phoneCountryCode, v.phoneNumber);
  const whatsapp = v.whatsappSameAsPhone ? phone : toE164(v.whatsappCountryCode, v.whatsappNumber);
  return {
    email: email || undefined,
    phone: phone || undefined,
    whatUpNo: whatsapp || undefined,
  };
}

/** The tenant's channel code for each signup option. */
export const SIGNUP_CHANNEL: Record<OtpChannel, Channel> = { email: "EMAIL", phone: "SMS", whatsapp: "WHATSAPP" };

/**
 * Channels the user asked to verify, limited to those with a value and, when given, to the
 * channels the organisation has switched on.
 */
export function requestedChannels(v: SignupFormValues, enabled?: Channel[]): OtpChannel[] {
  const contact = contactFromForm(v);
  const on = (c: OtpChannel) => !enabled || enabled.includes(SIGNUP_CHANNEL[c]);
  const channels: OtpChannel[] = [];
  if (v.verifyEmail && contact.email && on("email")) channels.push("email");
  if (v.verifyPhone && contact.phone && on("phone")) channels.push("phone");
  if (v.verifyWhatsapp && contact.whatUpNo && on("whatsapp")) channels.push("whatsapp");
  return channels;
}

export function validateSignup(
  v: SignupFormValues,
  options: { requireSignupType: boolean; enabledChannels?: Channel[] },
): SignupFieldErrors {
  const errors: SignupFieldErrors = {};
  const firstName = v.firstName.trim();
  const lastName = v.lastName.trim();

  if (!firstName) errors.firstName = "Enter your first name.";
  else if (firstName.length > 100) errors.firstName = "Use 100 characters or fewer.";
  if (!lastName) errors.lastName = "Enter your last name.";
  else if (lastName.length > 100) errors.lastName = "Use 100 characters or fewer.";

  if (v.email.trim() && !isEmail(v.email)) errors.email = "Enter a valid email address.";
  if (v.phoneNumber.trim() && !isValidLocalNumber(v.phoneCountryCode, v.phoneNumber)) {
    errors.phoneNumber = "Enter a valid phone number.";
  }
  if (!v.whatsappSameAsPhone && v.whatsappNumber.trim() && !isValidLocalNumber(v.whatsappCountryCode, v.whatsappNumber)) {
    errors.whatsappNumber = "Enter a valid WhatsApp number.";
  }

  if (options.requireSignupType && !v.signupType) errors.signupType = "Choose how you're signing up.";

  const contact = contactFromForm(v);
  if (!contact.email && !contact.phone && !contact.whatUpNo) {
    errors.form = "Enter at least an email address, phone number or WhatsApp number.";
  } else if (!errors.email && !errors.phoneNumber && !errors.whatsappNumber && requestedChannels(v, options.enabledChannels).length === 0) {
    errors.form = "Choose at least one way to receive your verification code.";
  }
  return errors;
}

export function toSignupSessionRequest(
  v: SignupFormValues,
  signupType: string | undefined,
  enabledChannels?: Channel[],
): SignupSessionRequest {
  const channels = requestedChannels(v, enabledChannels);
  return {
    firstName: v.firstName.trim(),
    lastName: v.lastName.trim(),
    ...contactFromForm(v),
    signupType: signupType || undefined,
    isEmailOtpRequested: channels.includes("email"),
    isPhoneOtpRequested: channels.includes("phone"),
    isWhatUpNoOtpRequested: channels.includes("whatsapp"),
  };
}

export const OTP_PATTERN = /^[0-9]{6}$/;
