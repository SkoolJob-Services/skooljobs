import { ApiError } from "./errors";
import type { AuthApi } from "./authApi";
import { newFlowSessionId } from "./sessionId";
import type { CommandAcceptedResponse, InviteDetailsResponse, InviteResponse } from "./types";
import { maskEmail, maskPhone } from "../lib/contact";

/**
 * In-browser mock of the API for local UI work (`npm run dev:mock`).
 *
 * - Every OTP is 123456.
 * - Signup with an email containing "exists" returns 409.
 * - Login with an identifier containing "unknown" returns 404.
 * - Self-signup always creates a TEACHER. SCHOOL_ADMIN / SCHOOL_MEMBER accounts
 *   only come from accepting an invite (created via Admin → Invite Schools).
 *   Invites expire after 3 days and can be used once; revoked, accepted or
 *   expired invite links are rejected.
 * - Login: the token carries the role the account was created with. Like the
 *   real Signup token it has no school: linking an invite to a school is a
 *   SchoolProfile concern. Identifiers that never signed up log in as TEACHER.
 *   The platform admin logs in through features/auth/localAccounts, not here.
 * - Like the real service, creating an invite does not reject a second pending
 *   invite to the same contact (only a target containing "exists" returns 409).
 *
 * Invites and accounts are kept in localStorage so the invite link still works
 * after a reload or in another tab of the dev server.
 */
export const MOCK_OTP = "123456";

const INVITE_TTL_MS = 3 * 24 * 3600 * 1000;
const INVITES_KEY = "skooljobs_mock_invites";
const ACCOUNTS_KEY = "skooljobs_mock_accounts";

interface MockInvite extends InviteResponse {
  token?: string;
  firstName?: string;
  lastName?: string;
}

interface MockAccount {
  role: string;
}

function loadStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveStored(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable: state lives for this page load only
  }
}

const identifierKey = (identifier: string) => identifier.trim().toLowerCase();

const seedInvites = (): MockInvite[] => [
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

let state: { invites: MockInvite[]; accounts: Record<string, MockAccount> } | null = null;

/**
 * Invites, and accounts by identifier (email lower-case, phone E.164). Loaded on
 * first use so the module has no load-time side effects and the production build
 * (which never uses the mock) drops it entirely.
 */
function store() {
  state ??= {
    invites: loadStored<MockInvite[]>(INVITES_KEY, seedInvites()),
    accounts: loadStored<Record<string, MockAccount>>(ACCOUNTS_KEY, {}),
  };
  return state;
}
const saveInvites = () => saveStored(INVITES_KEY, store().invites);

/** In-progress signups by flow session id: self-signup identifiers, or the invite being accepted. */
const pendingSignups = new Map<string, { inviteToken?: string }>();

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

function newInviteToken(): string {
  return `mock-${newFlowSessionId().replace(/^sess_/, "")}`;
}

/** Mark PENDING invites past their expiry as EXPIRED. */
function expireInvites() {
  let changed = false;
  store().invites.forEach((invite) => {
    if (invite.status === "PENDING" && invite.expiresAt && Date.parse(invite.expiresAt) < Date.now()) {
      invite.status = "EXPIRED";
      changed = true;
    }
  });
  if (changed) saveInvites();
}

/** The invite for this link token, if it can still be used (pending, not expired). */
function usableInvite(token: string): MockInvite {
  expireInvites();
  const invite = token ? store().invites.find((item) => item.token === token) : undefined;
  if (!invite) throw new ApiError(404, "INVITE_NOT_FOUND", "Invalid or expired invite.");
  if (invite.status !== "PENDING") throw new ApiError(410, "INVITE_INVALID", "This invite is no longer valid.");
  return invite;
}

/** Unsigned JWT-shaped token so the role logic runs exactly as with the real API. */
function mockAccessToken(identifier: string): string {
  const key = identifierKey(identifier);
  const account = store().accounts[key];
  const header = base64Url(JSON.stringify({ alg: "none", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({
      sub: `mock-${key}`,
      tid: "tenant-demo",
      app: "app-demo",
      roles: [account?.role ?? "TEACHER"],
      email: key.includes("@") ? key : undefined,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  );
  return `${header}.${payload}.`;
}

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
      // Same shape as signup-api 0.0.1-dev.2 (otpChannels per flow).
      otpChannels: { login: ["EMAIL", "WHATSAPP", "SMS"], signup: ["EMAIL", "WHATSAPP", "SMS"], invite: ["EMAIL", "WHATSAPP", "SMS"] },
    } as Awaited<ReturnType<AuthApi["getCurrentTenant"]>>;
  },

  async createSignupSession(body) {
    await delay();
    const identifiers = [body.email, body.phone, body.whatUpNo].filter((id): id is string => !!id);
    if (body.email?.includes("exists") || identifiers.some((id) => store().accounts[identifierKey(id)])) {
      throw new ApiError(409, "USER_ALREADY_EXISTS", "A user with these details already exists.");
    }
    const sessionId = newFlowSessionId();
    pendingSignups.set(sessionId, {});
    return { sessionId, result: accepted("Signup session creation accepted for processing.") };
  },

  async completeSignup(body, sessionId) {
    await delay();
    const pending = pendingSignups.get(sessionId);
    if (!pending) throw new ApiError(404, "SIGNUP_SESSION_NOT_FOUND", "Signup session not found.");
    if (body.isEmailOtpRequested) checkOtp(body.emailOtpHash, 409);
    if (body.isPhoneOtpRequested) checkOtp(body.phoneOtpHash, 409);
    if (body.isWhatUpNoOtpRequested) checkOtp(body.whatUpNoOtpHash, 409);

    if (pending.inviteToken) {
      // Single use: the invite must still be pending, and is consumed here.
      const invite = usableInvite(pending.inviteToken);
      invite.status = "ACCEPTED";
      saveInvites();
      store().accounts[identifierKey(invite.target ?? "")] = { role: invite.role ?? "SCHOOL_MEMBER" };
    } else {
      [body.email, body.phone, body.whatUpNo].forEach((id) => {
        if (id) store().accounts[identifierKey(id)] = { role: "TEACHER" };
      });
    }
    saveStored(ACCOUNTS_KEY, store().accounts);
    pendingSignups.delete(sessionId);
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
    const invite = usableInvite(inviteToken);
    const target = invite.target ?? "";
    // channel and invitee names are read defensively by the invite pages.
    return {
      tenantName: "SkoolJobs",
      tenantLogoUrl: "",
      invitedByName: "SkoolJobs Admin",
      role: invite.role,
      channel: invite.channel,
      maskedTarget: target.includes("@") ? maskEmail(target) : maskPhone(target),
      expiresAt: invite.expiresAt,
      inviteeFirstName: invite.firstName,
      inviteeLastName: invite.lastName,
    } as InviteDetailsResponse;
  },

  async acceptInvite(inviteToken) {
    await delay();
    usableInvite(inviteToken);
    const sessionId = newFlowSessionId();
    pendingSignups.set(sessionId, { inviteToken });
    return { sessionId, result: accepted("Signup started, OTP sent.") };
  },

  async createInvite(body) {
    await delay();
    expireInvites();
    if (body.target.includes("exists")) {
      throw new ApiError(409, "INVITE_EXISTS", "An invite or account already exists for this contact.");
    }
    const token = newInviteToken();
    const invite: MockInvite = {
      inviteId: `inv-${Date.now()}`,
      role: body.role,
      channel: body.channel,
      target: body.target,
      status: "PENDING",
      expiresAt: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
      token,
      firstName: body.firstName,
      lastName: body.lastName,
    };
    store().invites.unshift(invite);
    saveInvites();
    return { ...invite, inviteLink: `${window.location.origin}/invite?token=${token}` };
  },

  async listInvites(status) {
    await delay(300);
    expireInvites();
    return store().invites.filter((invite) => !status || invite.status === status);
  },

  async resendInvite(inviteId) {
    await delay();
    expireInvites();
    const invite = store().invites.find((item) => item.inviteId === inviteId);
    if (!invite) throw new ApiError(404, "INVITE_NOT_FOUND", "Invite not found.");
    if (invite.status === "ACCEPTED" || invite.status === "REVOKED") {
      throw new ApiError(409, "INVITE_INVALID", "This invite can't be resent.");
    }
    invite.status = "PENDING";
    invite.expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();
    invite.token = newInviteToken();
    saveInvites();
    return { ...invite, inviteLink: `${window.location.origin}/invite?token=${invite.token}` };
  },

  async revokeInvite(inviteId) {
    await delay();
    const invite = store().invites.find((item) => item.inviteId === inviteId);
    if (!invite) throw new ApiError(404, "INVITE_NOT_FOUND", "Invite not found.");
    invite.status = "REVOKED";
    saveInvites();
    return { success: true, message: "Invite revoked." };
  },
};
