import { describe, expect, it } from "vitest";
import {
  requestedChannels,
  toSignupSessionRequest,
  validateSignup,
  type SignupFormValues,
} from "./signupForm";

const base: SignupFormValues = {
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@example.com",
  phoneCountryCode: "+91",
  phoneNumber: "",
  whatsappSameAsPhone: true,
  whatsappCountryCode: "+91",
  whatsappNumber: "",
  signupType: "",
  verifyEmail: true,
  verifyPhone: false,
  verifyWhatsapp: false,
};

describe("validateSignup", () => {
  it("accepts a complete form", () => {
    expect(validateSignup(base, { requireSignupType: false })).toEqual({});
  });

  it("requires first and last name", () => {
    const errors = validateSignup({ ...base, firstName: " ", lastName: "" }, { requireSignupType: false });
    expect(errors.firstName).toBeDefined();
    expect(errors.lastName).toBeDefined();
  });

  it("limits names to 100 characters", () => {
    const errors = validateSignup({ ...base, firstName: "a".repeat(101) }, { requireSignupType: false });
    expect(errors.firstName).toBeDefined();
  });

  it("needs at least one contact detail", () => {
    const errors = validateSignup({ ...base, email: "" }, { requireSignupType: false });
    expect(errors.form).toMatch(/at least/i);
  });

  it("needs at least one verification channel", () => {
    const errors = validateSignup({ ...base, verifyEmail: false }, { requireSignupType: false });
    expect(errors.form).toMatch(/verification code/i);
  });

  it("flags an invalid email and phone", () => {
    const errors = validateSignup({ ...base, email: "john@", phoneNumber: "12" }, { requireSignupType: false });
    expect(errors.email).toBeDefined();
    expect(errors.phoneNumber).toBeDefined();
  });

  it("requires a signup type when the tenant offers several", () => {
    expect(validateSignup(base, { requireSignupType: true }).signupType).toBeDefined();
    expect(validateSignup({ ...base, signupType: "PARENT" }, { requireSignupType: true }).signupType).toBeUndefined();
  });
});

describe("requestedChannels", () => {
  it("ignores channels without a contact value", () => {
    expect(requestedChannels({ ...base, verifyPhone: true })).toEqual(["email"]);
  });

  it("uses the phone number for WhatsApp when 'same as phone' is ticked", () => {
    const values = { ...base, phoneNumber: "9876543210", verifyPhone: true, verifyWhatsapp: true };
    expect(requestedChannels(values)).toEqual(["email", "phone", "whatsapp"]);
  });
});

describe("toSignupSessionRequest", () => {
  it("builds the API request with E.164 numbers and OTP flags", () => {
    const values = { ...base, firstName: " John ", phoneNumber: "98765 43210", verifyWhatsapp: true };
    expect(toSignupSessionRequest(values, "PARENT")).toEqual({
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      phone: "+919876543210",
      whatUpNo: "+919876543210",
      signupType: "PARENT",
      isEmailOtpRequested: true,
      isPhoneOtpRequested: false,
      isWhatUpNoOtpRequested: true,
    });
  });

  it("omits empty contact fields and an empty signup type", () => {
    const request = toSignupSessionRequest(base, "");
    expect(request.phone).toBeUndefined();
    expect(request.whatUpNo).toBeUndefined();
    expect(request.signupType).toBeUndefined();
  });
});
