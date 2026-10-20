import { isApiError } from "../api/errors";

export type ErrorContext =
  | "tenant"
  | "signupStart"
  | "signupComplete"
  | "loginRequest"
  | "loginVerify"
  | "inviteDetails"
  | "inviteAccept"
  | "inviteCreate"
  | "inviteList"
  | "inviteManage";

/** Specific backend error codes → user-facing text. Extend as the backend documents more codes. */
const BY_CODE: Record<string, string> = {
  SIGNUP_SESSION_NOT_FOUND: "Your signup session has expired. Please start again.",
  NETWORK_ERROR: "Unable to reach the server. Check your connection and try again.",
};

const BY_STATUS: Partial<Record<ErrorContext, Record<number, string>>> = {
  tenant: {
    403: "This organisation is unknown or no longer active.",
  },
  signupStart: {
    409: "An account or a signup in progress already exists for these details. Try logging in instead.",
  },
  signupComplete: {
    404: "Your signup session was not found. Please start again.",
    409: "One or more codes are incorrect, or these details are already registered.",
    410: "Your code or signup session has expired. Please start again.",
  },
  loginRequest: {
    404: "No account found for this email or phone number.",
    409: "We can't send a login code for this account right now. Please contact support.",
    429: "Too many code requests. Please wait a while and try again.",
  },
  loginVerify: {
    401: "The code you entered is incorrect.",
    404: "Your login session was not found. Please request a new code.",
    410: "This code has expired. Request a new one.",
    429: "Too many attempts. Please wait a while and try again.",
  },
  inviteDetails: {
    404: "This invite link is invalid or has expired.",
  },
  inviteAccept: {
    404: "This invite link is invalid or has expired.",
  },
  inviteCreate: {
    403: "You don't have permission to send this invite.",
    409: "An invite or an account already exists for this contact.",
  },
  inviteList: {
    403: "You don't have permission to see invites.",
  },
  inviteManage: {
    403: "You don't have permission to change this invite.",
    404: "This invite no longer exists.",
    409: "This invite can't be changed any more (already accepted or revoked).",
  },
};

export function errorMessage(error: unknown, context: ErrorContext): string {
  if (!isApiError(error)) return "Something went wrong. Please try again.";
  const byCode = BY_CODE[error.code];
  if (byCode) return byCode;
  const byStatus = BY_STATUS[context]?.[error.status];
  if (byStatus) return byStatus;
  if (error.status === 400) return error.message || "Some details are invalid. Please check and try again.";
  if (error.status >= 500) return "Something went wrong on our side. Please try again.";
  return error.message || "Something went wrong. Please try again.";
}
