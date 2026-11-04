/**
 * Request/response models come from the generated @app/signup-api package,
 * so they always match the published contract. Only app-specific types
 * are defined here.
 */
export type {
  AcceptInviteRequest,
  CommandAcceptedResponse,
  CompleteSignupRequest,
  CreateInviteRequest,
  ErrorResponse,
  InviteDetailsResponse,
  InviteResponse,
  LoginOtpAcceptedResponse,
  LoginOtpRequest,
  LoginOtpVerifyRequest,
  LoginResponse,
  SignupSessionRequest,
  SuccessResponse,
  TenantInfoResponse,
} from "@app/signup-api";

/** Result of a first-step call that starts an OTP flow. */
export interface OtpFlowStarted<T> {
  /** Value to send as X-Session-Id on the matching verify call. */
  sessionId: string;
  result: T;
}

/** Channels an invite can be sent by (CreateInviteRequest.channel). */
export type InviteChannel = "EMAIL" | "SMS" | "WHATSAPP";

/** Body for POST /invites, with the channel as a plain string union. */
export type NewInvite = Omit<import("@app/signup-api").CreateInviteRequest, "channel"> & { channel: InviteChannel };

/** Invite statuses accepted by GET /invites?status=. */
export type InviteStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
