import type { CompleteSignupRequest } from "../../api";
import type { PendingInvite } from "../FlowContext";

/**
 * Build the /signup/complete body for an invite.
 *
 * OPEN QUESTION for the backend team: the invite's channel (EMAIL, SMS or
 * WHATSAPP) isn't returned by GET /invites/details, so the client can't be
 * sure which OTP field to fill. Until that's confirmed, the channel is
 * inferred from maskedTarget ("@" ⇒ email, otherwise SMS). If the backend
 * adds `channel` to InviteDetailsResponse, switch on it here — nothing else
 * needs to change.
 */
export function inviteCompleteRequest(invite: PendingInvite, otp: string): CompleteSignupRequest {
  const channel = inferInviteChannel(invite);
  return {
    firstName: invite.firstName,
    lastName: invite.lastName,
    isEmailOtpRequested: channel === "EMAIL",
    isPhoneOtpRequested: channel === "SMS",
    isWhatUpNoOtpRequested: channel === "WHATSAPP",
    emailOtpHash: channel === "EMAIL" ? otp : undefined,
    phoneOtpHash: channel === "SMS" ? otp : undefined,
    whatUpNoOtpHash: channel === "WHATSAPP" ? otp : undefined,
  };
}

export type InviteChannel = "EMAIL" | "SMS" | "WHATSAPP";

export function inferInviteChannel(invite: PendingInvite): InviteChannel {
  const details = invite.details as { channel?: string; maskedTarget?: string };
  const explicit = details.channel?.toUpperCase();
  if (explicit === "EMAIL" || explicit === "SMS" || explicit === "WHATSAPP") return explicit;
  return details.maskedTarget?.includes("@") ? "EMAIL" : "SMS";
}
