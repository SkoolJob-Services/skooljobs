import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { inviteCompleteRequest } from "../features/invite/inviteRequest";
import { toLegacyUser } from "../features/auth/legacyUser";
import { ROLE_HOME, roleFromToken } from "../features/auth/roles";
import type { AuthApi } from "./authApi";

// The mock keeps state at module level and in localStorage; give each test a fresh copy of both.
let api: AuthApi;
let OTP: string;

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

/** Run a mock call to completion without waiting for its simulated network delay. */
async function call<T>(promise: Promise<T>): Promise<T> {
  const settled = promise.then(
    (value) => ({ value }),
    (error: unknown) => ({ error }),
  );
  await vi.runAllTimersAsync();
  const result = await settled;
  if ("error" in result) throw result.error;
  return result.value;
}

beforeEach(async () => {
  vi.useFakeTimers();
  vi.stubGlobal("localStorage", memoryStorage());
  vi.stubGlobal("window", { location: { origin: "http://localhost:5173" } });
  vi.resetModules();
  const mod = await import("./mockAuthApi");
  api = mod.mockAuthApi;
  OTP = mod.MOCK_OTP;
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** Same payload Admin → Invite Schools sends. */
async function inviteSchool(email = "principal@greenvalley.in") {
  const invite = await call(
    api.createInvite({
      role: "SCHOOL_ADMIN",
      channel: "EMAIL",
      target: email,
      firstName: "Asha",
      lastName: "Verma",
    }),
  );
  const token = new URL(invite.inviteLink!).searchParams.get("token")!;
  return { invite, token };
}

/** InvitePage → InviteVerifyPage, as the pages call the API. */
async function acceptAndVerify(token: string, otp = OTP) {
  const details = await call(api.getInviteDetails(token));
  const { sessionId } = await call(api.acceptInvite(token, { firstName: "Asha", lastName: "Verma" }));
  const pending = { token, details, firstName: "Asha", lastName: "Verma", sessionId };
  await call(api.completeSignup(inviteCompleteRequest(pending, otp), sessionId));
  return details;
}

/** LoginPage → LoginVerifyPage. */
async function login(identifier: string) {
  const { sessionId } = await call(api.requestLoginOtp({ identifier }));
  const response = await call(api.verifyLoginOtp({ identifier, otp: OTP }, sessionId));
  const { role, roleCodes } = roleFromToken(response.accessToken);
  return { response, role, roleCodes, home: ROLE_HOME[role] };
}

describe("invited school admin flow (mock)", () => {
  it("invite → signup → email OTP → login OTP → school dashboard", async () => {
    const { invite, token } = await inviteSchool();
    expect(invite.status).toBe("PENDING");
    expect(invite.inviteLink).toMatch(/^http:\/\/localhost:5173\/invite\?token=mock-/);

    const details = (await call(api.getInviteDetails(token))) as Record<string, unknown>;
    expect(details).toMatchObject({
      role: "SCHOOL_ADMIN",
      channel: "EMAIL",
      inviteeFirstName: "Asha",
    });
    // Like Signup's InviteDetailsResponse: nothing about a school.
    expect(details.contextLabel).toBeUndefined();
    expect(details.maskedTarget).toMatch(/@greenvalley\.in$/);

    // The OTP goes to the invited email, and a wrong code is refused.
    const { sessionId } = await call(api.acceptInvite(token, { firstName: "Asha", lastName: "Verma" }));
    const pending = { token, details, firstName: "Asha", lastName: "Verma", sessionId };
    const request = inviteCompleteRequest(pending, "000000");
    expect(request.isEmailOtpRequested).toBe(true);
    await expect(call(api.completeSignup(request, sessionId))).rejects.toMatchObject({ status: 409 });
    await call(api.completeSignup(inviteCompleteRequest(pending, OTP), sessionId));

    const { response, role, home } = await login("principal@greenvalley.in");
    expect(role).toBe("SCHOOL_ADMIN");
    expect(home).toBe("/school/dashboard");
    const user = toLegacyUser(
      { accessToken: response.accessToken, identifier: "principal@greenvalley.in" } as never,
      role,
      [],
    );
    expect(user).toMatchObject({ role: "employer" });
    // Like the real Signup token: roles only, no school identity.
    const claims = JSON.parse(atob(response.accessToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    expect(claims.schoolProfileId).toBeUndefined();
    expect(claims.schoolName).toBeUndefined();

    const invites = await call(api.listInvites());
    expect(invites.find((item) => item.inviteId === invite.inviteId)?.status).toBe("ACCEPTED");
  });

  it("invite links are single use", async () => {
    const { token } = await inviteSchool();
    await acceptAndVerify(token);
    await expect(call(api.getInviteDetails(token))).rejects.toMatchObject({ status: 410 });
    await expect(call(api.acceptInvite(token, {}))).rejects.toMatchObject({ status: 410 });
  });

  it("rejects unknown, revoked and expired invite links", async () => {
    await expect(call(api.getInviteDetails("mock-made-up"))).rejects.toMatchObject({ status: 404 });

    const revoked = await inviteSchool("a@school-one.in");
    await call(api.revokeInvite(revoked.invite.inviteId!));
    await expect(call(api.getInviteDetails(revoked.token))).rejects.toMatchObject({ status: 410 });

    const expired = await inviteSchool("b@school-two.in");
    vi.setSystemTime(Date.now() + 4 * 24 * 3600 * 1000);
    await expect(call(api.getInviteDetails(expired.token))).rejects.toMatchObject({ status: 410 });
  });

  it("an invite accepted in another tab can't be completed again", async () => {
    const { token } = await inviteSchool();
    const details = await call(api.getInviteDetails(token));
    const first = await call(api.acceptInvite(token, {}));
    const second = await call(api.acceptInvite(token, {}));
    const pending = { token, details, firstName: "A", lastName: "V" };
    await call(api.completeSignup(inviteCompleteRequest({ ...pending, sessionId: first.sessionId }, OTP), first.sessionId));
    await expect(
      call(api.completeSignup(inviteCompleteRequest({ ...pending, sessionId: second.sessionId }, OTP), second.sessionId)),
    ).rejects.toMatchObject({ status: 410 });
  });
});

describe("invited school admin's school profile (mock)", () => {
  it("an invited admin has no school until the invite is linked to it (no linking API yet)", async () => {
    vi.stubGlobal("sessionStorage", memoryStorage());
    // @ts-expect-error -- plain JS module, no type declarations
    const { mockSchoolProfileService: schools } = await import("../services/mockSchoolProfileService");
    const { sessionStore } = await import("../features/auth/sessionStore");

    const { data: created } = await schools.createSchoolProfile({
      schoolName: "Green Valley School",
      contact: { email: "principal@greenvalley.in", phone: "+919876543210" },
    });
    expect(created.schoolProfileId).toEqual(expect.any(String));
    const { token } = await inviteSchool();
    await acceptAndVerify(token);
    const { response } = await login("principal@greenvalley.in");

    sessionStore.save({ accessToken: response.accessToken, identifier: "principal@greenvalley.in" } as never);
    await expect(schools.getMySchoolProfile()).rejects.toMatchObject({ response: { status: 404 } });
  });
});

describe("teacher flow and no role escalation (mock)", () => {
  async function selfSignup(email: string, signupType?: string) {
    const body = { firstName: "T", lastName: "S", email, signupType, isEmailOtpRequested: true };
    const { sessionId } = await call(api.createSignupSession(body));
    await call(api.completeSignup({ ...body, emailOtpHash: OTP }, sessionId));
  }

  it("teacher signup → login opens the teacher dashboard", async () => {
    await selfSignup("teacher@test.com", "TEACHER");
    const { role, home } = await login("teacher@test.com");
    expect(role).toBe("TEACHER");
    expect(home).toBe("/teacher/dashboard");
  });

  it("only offers teacher self-signup", async () => {
    const tenant = await call(api.getCurrentTenant());
    expect(tenant.selfSignupTypes).toEqual(["TEACHER"]);
  });

  it("self-signup can't become a school admin, whatever the type or email says", async () => {
    await selfSignup("admin.school@greenvalley.in", "SCHOOL_ADMIN");
    expect((await login("admin.school@greenvalley.in")).role).toBe("TEACHER");
    // No role guessing from the identifier for accounts that never signed up either.
    expect((await login("school@test.com")).role).toBe("TEACHER");
  });

  it("an invited email can't be taken by a self-signup", async () => {
    const { token } = await inviteSchool();
    await acceptAndVerify(token);
    await expect(
      call(api.createSignupSession({ firstName: "X", lastName: "Y", email: "principal@greenvalley.in" })),
    ).rejects.toMatchObject({ status: 409 });
  });
});
