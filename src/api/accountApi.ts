import { EmailApi, type SignupApi } from "@app/signup-api";
import { config } from "../config/env";
import { ApiError } from "./errors";
import { apiConfiguration, http } from "./httpClient";

/*
 * Changing the login email of the signed-in user — signup's Email endpoints through the
 * generated EmailApi of @app/signup-api:
 *   POST /auth/email         { email }        → a code is sent to the new address (409: used by another account)
 *   POST /auth/email/verify  { email, otp }   → the user-profile record's email changes (login follows it)
 * signup then publishes USER_EMAIL_VERIFIED; the teacher-profile service updates the profile's email.
 *
 * Adding or changing the WhatsApp number works the same way, with the code sent on WhatsApp:
 *   POST /auth/whatsapp         { whatUpNo }        → a code is sent to the new number (409: used by another account)
 *   POST /auth/whatsapp/verify  { whatUpNo, otp }   → the user-profile record's WhatsApp number changes (WhatsApp login follows it)
 * signup then publishes USER_WHATSAPP_VERIFIED; the teacher-profile service updates the profile's WhatsApp number.
 *
 * And the mobile number, with the code sent by SMS:
 *   POST /auth/phone         { phone }        → a code is sent by SMS (409: used by another account)
 *   POST /auth/phone/verify  { phone, otp }   → the user-profile record's phone changes (SMS login follows it)
 * signup then publishes USER_PHONE_VERIFIED; the teacher-profile service updates the profile's mobile.
 *
 * Numbers are E.164 (+919876543210). WhatsApp and SMS need the channel on for login in the
 * tenant's otpChannels (400 OTP_CHANNEL_DISABLED).
 */
export interface AccountApi {
  requestEmailCode(email: string): Promise<void>;
  verifyEmailCode(email: string, otp: string): Promise<void>;
  requestWhatsAppCode(whatUpNo: string): Promise<void>;
  verifyWhatsAppCode(whatUpNo: string, otp: string): Promise<void>;
  requestPhoneCode(phone: string): Promise<void>;
  verifyPhoneCode(phone: string, otp: string): Promise<void>;
}

type GeneratedAxios = ConstructorParameters<typeof SignupApi>[2];
const emailClient = new EmailApi(apiConfiguration, undefined, http as unknown as GeneratedAxios);

const normalize = (email: string) => email.trim().toLowerCase();

export const httpAccountApi: AccountApi = {
  async requestEmailCode(email) {
    await emailClient.requestEmailVerification({ email: normalize(email) });
  },
  async verifyEmailCode(email, otp) {
    await emailClient.verifyEmail({ email: normalize(email), otp: otp.trim() });
  },
  // signup's WhatsApp and phone endpoints arrive in @app/signup-api 0.0.1-dev.4 (WhatsAppApi,
  // PhoneApi); until that package is published they are called directly, with the same client.
  async requestWhatsAppCode(whatUpNo) {
    await http.post(`${config.apiBaseUrl}/auth/whatsapp`, { whatUpNo });
  },
  async verifyWhatsAppCode(whatUpNo, otp) {
    await http.post(`${config.apiBaseUrl}/auth/whatsapp/verify`, { whatUpNo, otp: otp.trim() });
  },
  async requestPhoneCode(phone) {
    await http.post(`${config.apiBaseUrl}/auth/phone`, { phone });
  },
  async verifyPhoneCode(phone, otp) {
    await http.post(`${config.apiBaseUrl}/auth/phone/verify`, { phone, otp: otp.trim() });
  },
};

/**
 * `npm run dev:mock`: the code is always 123456; an address containing "taken", or a number
 * ending in 0000, is in use by another account.
 */
export const MOCK_EMAIL_CODE = "123456";
const wait = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockAccountApi: AccountApi = {
  async requestEmailCode(email) {
    await wait();
    if (email.includes("taken")) throw new ApiError(409, "EMAIL_IN_USE", "This email is used by another account.");
  },
  async verifyEmailCode(_email, otp) {
    await wait();
    if (otp.trim() !== MOCK_EMAIL_CODE) throw new ApiError(400, "EMAIL_OTP_INVALID", "The code is not correct.");
  },
  async requestWhatsAppCode(whatUpNo) {
    await wait();
    if (whatUpNo.endsWith("0000")) {
      throw new ApiError(409, "WHATSAPP_IN_USE", "This WhatsApp number is used by another account.");
    }
  },
  async verifyWhatsAppCode(_whatUpNo, otp) {
    await wait();
    if (otp.trim() !== MOCK_EMAIL_CODE) throw new ApiError(400, "WHATSAPP_OTP_INVALID", "The code is not correct.");
  },
  async requestPhoneCode(phone) {
    await wait();
    if (phone.endsWith("0000")) {
      throw new ApiError(409, "PHONE_IN_USE", "This mobile number is used by another account.");
    }
  },
  async verifyPhoneCode(_phone, otp) {
    await wait();
    if (otp.trim() !== MOCK_EMAIL_CODE) throw new ApiError(400, "PHONE_OTP_INVALID", "The code is not correct.");
  },
};

// The mock issues no real codes: never in a production build (same rule as api/index.ts).
export const accountApi: AccountApi = import.meta.env.DEV && config.useMockApi ? mockAccountApi : httpAccountApi;
