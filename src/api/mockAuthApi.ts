import { ApiError } from "./errors";
import type { AuthApi } from "./authApi";
import { newFlowSessionId } from "./sessionId";
import type { CommandAcceptedResponse, InviteResponse } from "./types";

/**
 * In-browser mock of the API for local UI work (`npm run dev:mock`).
 *
 * - Every OTP is 123456.
 * - Signup with an email containing "exists" returns 409.
 * - Login with an identifier containing "unknown" returns 404.
 * - Invite token "expired" returns 404.
 * - Role on login comes from the identifier: contains "headadmin" → HEAD_ADMIN,
 *   "admin" → ADMIN, "member" → SCHOOL_MEMBER, "school" → SCHOOL_ADMIN,
 *   anything else → TEACHER (e.g. school@test.com, teacher@test.com).
 */
export const MOCK_OTP = "123456";

const delay = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms));

function accepted(message: string): CommandAcceptedResponse {
  return {
    commandId: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : String(Date.now()),
    status: "ACCEPTED",
    message,
    timestamp: new Date().toISOString(),
  };
}

function checkOtp(otp: string | undefined, status: number) {
  if (otp !== MOCK_OTP) {
    throw new ApiError(status, "INVALID_OTP", "The code you entered is incorrect.");
  }
}

function base64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Unsigned JWT-shaped token so the role logic runs exactly as with the real API. */
function mockAccessToken(identifier: string): string {
  const lower = identifier.toLowerCase();
  const role = lower.includes("headadmin")
    ? "HEAD_ADMIN"
    : lower.includes("admin")
      ? "ADMIN"
      : lower.includes("member")
        ? "SCHOOL_MEMBER"
        : lower.includes("school")
          ? "SCHOOL_ADMIN"
          : "TEACHER";
  const roles = [role];
  const header = base64Url(JSON.stringify({ alg: "none", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({ sub: `mock-${lower}`, tid: "tenant-demo", app: "app-demo", roles, email: lower.includes("@") ? lower : undefined, exp: Math.floor(Date.now() / 1000) + 3600 }),
  );
  return `${header}.${payload}.`;
}

const mockInvites: InviteResponse[] = [
  {
    inviteId: "inv-1",
    role: "SCHOOL_MEMBER",
    channel: "SMS",
    target: "+919876500001",
    status: "PENDING",
    expiresAt: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
  },
  {
    inviteId: "inv-2",
    role: "SCHOOL_ADMIN",
    channel: "EMAIL",
    target: "asha@example.com",
    status: "ACCEPTED",
    expiresAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
];

export const mockAuthApi: AuthApi = {
  async getCurrentTenant() {
    await delay(300);
    return {
      tenantId: "tenant-demo",
      appId: "app-demo",
      code: "SKOOLJOBS",
      name: "SkoolJobs",
      logoUrl: "",
      signupPolicy: "OPEN",
      selfSignupTypes: ["TEACHER"],
    };
  },

  async createSignupSession(body) {
    await delay();
    if (body.email?.includes("exists")) {
      throw new ApiError(409, "USER_ALREADY_EXISTS", "A user with these details already exists.");
    }
    return { sessionId: newFlowSessionId(), result: accepted("Signup session creation accepted for processing.") };
  },

  async completeSignup(body) {
    await delay();
    if (body.isEmailOtpRequested) checkOtp(body.emailOtpHash, 409);
    if (body.isPhoneOtpRequested) checkOtp(body.phoneOtpHash, 409);
    if (body.isWhatUpNoOtpRequested) checkOtp(body.whatUpNoOtpHash, 409);
    return accepted("Completed signup accepted.");
  },

  async requestLoginOtp(body) {
    await delay();
    if (body.identifier.includes("unknown")) {
      throw new ApiError(404, "USER_NOT_FOUND", "User not found.");
    }
    return { sessionId: newFlowSessionId(), result: { success: true, message: "Login OTP sent successfully." } };
  },

  async verifyLoginOtp(body, sessionId) {
    await delay();
    checkOtp(body.otp, 401);
    return {
      success: true,
      message: "Login successful.",
      accessToken: mockAccessToken(body.identifier),
      refreshToken: "mock-refresh-token",
      sessionId,
      tenantId: "tenant-demo",
      appId: "app-demo",
    };
  },

  async logout() {
    await delay(300);
    return { success: true, message: "Logout successful." };
  },

  async getInviteDetails(inviteToken) {
    await delay();
    if (inviteToken === "expired") {
      throw new ApiError(404, "INVITE_NOT_FOUND", "Invalid or expired invite.");
    }
    return {
      tenantName: "SkoolJobs",
      tenantLogoUrl: "",
      invitedByName: "Priya Sharma",
      role: "SCHOOL_MEMBER",
      maskedTarget: "j***@example.com",
      expiresAt: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
    };
  },

  async acceptInvite() {
    await delay();
    return { sessionId: newFlowSessionId(), result: accepted("Signup started, OTP sent.") };
  },

  async createInvite(body) {
    await delay();
    if (body.target.includes("exists")) {
      throw new ApiError(409, "INVITE_EXISTS", "An invite or account already exists for this contact.");
    }
    const invite: InviteResponse = {
      inviteId: `inv-${Date.now()}`,
      role: body.role,
      channel: body.channel,
      target: body.target,
      status: "PENDING",
      expiresAt: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
      inviteLink: `${window.location.origin}/invite?token=mock-${Date.now()}`,
    };
    mockInvites.unshift(invite);
    return invite;
  },

  async listInvites(status) {
    await delay(300);
    return mockInvites.filter((invite) => !status || invite.status === status);
  },

  async resendInvite(inviteId) {
    await delay();
    const invite = mockInvites.find((item) => item.inviteId === inviteId);
    if (!invite) throw new ApiError(404, "INVITE_NOT_FOUND", "Invite not found.");
    invite.expiresAt = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString();
    return { ...invite, inviteLink: `${window.location.origin}/invite?token=mock-${inviteId}` };
  },

  async revokeInvite(inviteId) {
    await delay();
    const invite = mockInvites.find((item) => item.inviteId === inviteId);
    if (!invite) throw new ApiError(404, "INVITE_NOT_FOUND", "Invite not found.");
    invite.status = "REVOKED";
    return { success: true, message: "Invite revoked." };
  },
};
