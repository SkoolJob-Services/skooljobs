import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/errors";
import {
  LINK_RETRY_DELAYS_MS,
  STEP,
  buildInviteRequest,
  buildSchoolRequest,
  checkInvitationStatus,
  isLinkRetryable,
  isRetryable,
  runInvitationSteps,
} from "./inviteSchoolWorkflow";

const values = {
  firstName: " Asha ",
  lastName: " Verma ",
  email: "  Principal@GreenValley.IN ",
  countryCode: "+91",
  phone: "98765 43210",
  schoolName: " Green Valley School ",
  schoolAddress: "12 MG Road, Indore",
};

const sentInvite = {
  inviteId: "inv-1",
  role: "SCHOOL_ADMIN",
  channel: "EMAIL",
  target: "principal@greenvalley.in",
  status: "PENDING",
  inviteLink: "https://app/invite?token=abc",
};

/** Fake APIs that count calls; override any of them per test. */
function fakeApi(overrides = {}) {
  return {
    createSchoolProfile: vi.fn().mockResolvedValue({ status: 202, data: { commandId: "c-1", schoolProfileId: "school-1" } }),
    createInvite: vi.fn().mockResolvedValue(sentInvite),
    listInvites: vi.fn().mockResolvedValue([]),
    resendInvite: vi.fn().mockResolvedValue({ ...sentInvite, inviteLink: "https://app/invite?token=resent" }),
    linkSchoolAdminInvite: vi.fn().mockResolvedValue({ status: 204 }),
    ...overrides,
  };
}

/** An error as the SchoolProfile client (axios via serviceHttp) rejects with. */
function serviceError(status, code) {
  return { isAxiosError: true, response: { status, data: code ? { code, message: code } : {} } };
}

const noWait = { sleep: () => Promise.resolve() };

describe("request payloads", () => {
  it("sends only SchoolProfile schema fields; no address (needs PIN, city, state, country)", () => {
    expect(buildSchoolRequest(values)).toEqual({
      schoolName: "Green Valley School",
      contact: { email: "principal@greenvalley.in", phone: "+919876543210" },
    });
  });

  it("sends only Signup CreateInviteRequest fields, email normalised, no context fields", () => {
    expect(buildInviteRequest(values)).toEqual({
      role: "SCHOOL_ADMIN",
      channel: "EMAIL",
      target: "principal@greenvalley.in",
      firstName: "Asha",
      lastName: "Verma",
    });
  });
});

describe("runInvitationSteps", () => {
  it("Scenario C: creates the school, then the invite, links them, and keeps all three", async () => {
    const api = fakeApi();
    const onStep = vi.fn();
    const { state, outcome } = await runInvitationSteps(values, {}, api, onStep);

    expect(outcome).toEqual({ type: "linked" });
    expect(state).toMatchObject({ schoolProfileId: "school-1", invite: sentInvite, linked: true });
    expect(api.createSchoolProfile).toHaveBeenCalledTimes(1);
    expect(api.createInvite).toHaveBeenCalledTimes(1);
    expect(api.linkSchoolAdminInvite).toHaveBeenCalledTimes(1);
    expect(api.linkSchoolAdminInvite).toHaveBeenCalledWith("school-1", "inv-1");
    expect(onStep.mock.calls.map(([step, status]) => `${step}:${status}`)).toEqual([
      "school:running",
      "school:done",
      "invite:running",
      "invite:done",
      "link:running",
      "link:done",
    ]);
    // The UI gets the new school id as soon as step 1 is done.
    expect(onStep.mock.calls[1][2]).toMatchObject({ schoolProfileId: "school-1" });
  });

  it("Scenario A: invite fails → school id kept; retry sends the invite without a second school", async () => {
    const api = fakeApi({
      createInvite: vi.fn().mockRejectedValueOnce(new Error("signup down")).mockResolvedValueOnce(sentInvite),
    });

    const first = await runInvitationSteps(values, {}, api);
    expect(first.outcome).toMatchObject({ type: "failed", step: STEP.INVITE, retryable: true });
    expect(first.state).toMatchObject({ schoolProfileId: "school-1", invite: null, inviteAttempted: true });

    const retry = await runInvitationSteps(values, first.state, api);
    expect(retry.outcome).toEqual({ type: "linked" });
    expect(retry.state).toMatchObject({ schoolProfileId: "school-1", invite: sentInvite });
    expect(api.createSchoolProfile).toHaveBeenCalledTimes(1);
    expect(api.createInvite).toHaveBeenCalledTimes(2);
  });

  it("Scenario A retry: an invite created despite the failed response is reused, not duplicated", async () => {
    const api = fakeApi({
      createInvite: vi.fn().mockRejectedValue(new Error("timeout")),
      // Empty before step 1; the invite shows up once the lost request went through.
      listInvites: vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([sentInvite]),
    });

    const first = await runInvitationSteps(values, {}, api);
    const retry = await runInvitationSteps(values, first.state, api);

    expect(retry.outcome).toEqual({ type: "linked" });
    expect(api.createInvite).toHaveBeenCalledTimes(1);
    expect(api.resendInvite).toHaveBeenCalledWith("inv-1");
    expect(retry.state.invite.inviteLink).toBe("https://app/invite?token=resent");
    expect(api.createSchoolProfile).toHaveBeenCalledTimes(1);
  });

  it("school fails → no invite is sent, and the retry creates the school", async () => {
    const api = fakeApi({
      createSchoolProfile: vi
        .fn()
        .mockRejectedValueOnce({ response: { status: 500 } })
        .mockResolvedValueOnce({ data: { schoolProfileId: "school-2" } }),
    });

    const first = await runInvitationSteps(values, {}, api);
    expect(first.outcome).toMatchObject({ type: "failed", step: STEP.SCHOOL, retryable: true });
    expect(first.state.schoolProfileId).toBeNull();
    expect(api.createInvite).not.toHaveBeenCalled();

    const retry = await runInvitationSteps(values, first.state, api);
    expect(retry.outcome).toEqual({ type: "linked" });
    expect(retry.state.schoolProfileId).toBe("school-2");
    expect(api.createInvite).toHaveBeenCalledTimes(1);
  });

  it("202 without a schoolProfileId → reported as accepted (not failed), stops before inviting", async () => {
    const api = fakeApi({
      createSchoolProfile: vi.fn().mockResolvedValue({ status: 202, data: { commandId: "c-1", status: "ACCEPTED" } }),
    });
    const onStep = vi.fn();

    const { state, outcome } = await runInvitationSteps(values, {}, api, onStep);
    expect(outcome).toEqual({ type: "noSchoolId" });
    expect(onStep.mock.calls.map(([step, status]) => `${step}:${status}`)).toEqual([
      "school:running",
      "school:accepted",
    ]);
    expect(state.schoolProfileId).toBeNull();
    expect(api.createSchoolProfile).toHaveBeenCalledTimes(1);
    expect(api.createInvite).not.toHaveBeenCalled();
  });

  it("a pending invite to the same email stops before anything is created", async () => {
    const api = fakeApi({ listInvites: vi.fn().mockResolvedValue([sentInvite]) });

    const { outcome } = await runInvitationSteps(values, {}, api);
    expect(outcome).toEqual({ type: "duplicate", existing: sentInvite });
    expect(api.createSchoolProfile).not.toHaveBeenCalled();
    expect(api.createInvite).not.toHaveBeenCalled();
  });

  it("ignores pending invites for other emails or roles", async () => {
    const api = fakeApi({
      listInvites: vi.fn().mockResolvedValue([
        { ...sentInvite, target: "someone@else.in" },
        { ...sentInvite, role: "SCHOOL_MEMBER" },
      ]),
    });

    const { outcome } = await runInvitationSteps(values, {}, api);
    expect(outcome).toEqual({ type: "linked" });
  });

  it("a failed duplicate lookup does not block sending", async () => {
    const api = fakeApi({ listInvites: vi.fn().mockRejectedValue(new Error("403")) });

    const { outcome } = await runInvitationSteps(values, {}, api);
    expect(outcome).toEqual({ type: "linked" });
  });

  it("once the school and the invite exist, only links them", async () => {
    const api = fakeApi();
    const { outcome } = await runInvitationSteps(values, { schoolProfileId: "school-1", invite: sentInvite }, api);

    expect(outcome).toEqual({ type: "linked" });
    expect(api.createSchoolProfile).not.toHaveBeenCalled();
    expect(api.createInvite).not.toHaveBeenCalled();
    expect(api.listInvites).not.toHaveBeenCalled();
    expect(api.linkSchoolAdminInvite).toHaveBeenCalledTimes(1);
  });

  it("calls nothing once all three steps are done", async () => {
    const api = fakeApi();
    const { outcome } = await runInvitationSteps(
      values,
      { schoolProfileId: "school-1", invite: sentInvite, linked: true },
      api,
    );

    expect(outcome).toEqual({ type: "linked" });
    expect(api.createSchoolProfile).not.toHaveBeenCalled();
    expect(api.createInvite).not.toHaveBeenCalled();
    expect(api.linkSchoolAdminInvite).not.toHaveBeenCalled();
  });
});

describe("invitation failures: retryable or not", () => {
  it.each([
    [400, "INVITE_INVALID", "role and target are required."],
    [403, "INVITE_ROLE_NOT_ALLOWED", "Your role cannot invite a user with role SCHOOL_ADMIN."],
    [409, "INVITE_EXISTS", "An invite or account already exists for this contact."],
  ])("HTTP %i → not retryable; school id kept, no invite, nothing created twice", async (status, code, message) => {
    const error = new ApiError(status, code, message);
    const api = fakeApi({ createInvite: vi.fn().mockRejectedValue(error) });

    const { state, outcome } = await runInvitationSteps(values, {}, api);
    expect(outcome).toEqual({ type: "failed", step: STEP.INVITE, error, retryable: false });
    expect(outcome.error.message).toBe(message);
    expect(state).toMatchObject({ schoolProfileId: "school-1", invite: null, inviteAttempted: true });
    expect(api.createSchoolProfile).toHaveBeenCalledTimes(1);
    expect(api.createInvite).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["network failure (no response)", new ApiError(0, "NETWORK_ERROR", "Unable to reach the server.")],
    ["HTTP 503", new ApiError(503, "HTTP_503", "Service Unavailable")],
    ["HTTP 500", new ApiError(500, "PLATFORM_INTERNAL_SERVER_ERROR", "Internal server error")],
    ["HTTP 429", new ApiError(429, "TOO_MANY_REQUESTS", "Too many requests")],
    ["HTTP 408", new ApiError(408, "TIMEOUT", "Request timeout")],
  ])("%s → retryable, and the retry succeeds without a second school or invite", async (_label, error) => {
    const api = fakeApi({ createInvite: vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce(sentInvite) });

    const first = await runInvitationSteps(values, {}, api);
    expect(first.outcome).toMatchObject({ type: "failed", step: STEP.INVITE, retryable: true });
    expect(first.state).toMatchObject({ schoolProfileId: "school-1", invite: null });

    const retry = await runInvitationSteps(values, first.state, api);
    expect(retry.outcome).toEqual({ type: "linked" });
    expect(retry.state).toMatchObject({ schoolProfileId: "school-1", invite: sentInvite });
    expect(api.createSchoolProfile).toHaveBeenCalledTimes(1);
    expect(api.createInvite).toHaveBeenCalledTimes(2);
    expect(api.resendInvite).not.toHaveBeenCalled();
  });
});

describe("link step", () => {
  it("waits out the asynchronous school creation: retries 404 SCH_006, then links", async () => {
    const notStoredYet = serviceError(404, "SCH_006");
    const sleep = vi.fn().mockResolvedValue(undefined);
    const api = fakeApi({
      linkSchoolAdminInvite: vi
        .fn()
        .mockRejectedValueOnce(notStoredYet)
        .mockRejectedValueOnce(notStoredYet)
        .mockResolvedValueOnce({ status: 204 }),
    });

    const { state, outcome } = await runInvitationSteps(values, {}, api, undefined, { sleep });

    expect(outcome).toEqual({ type: "linked" });
    expect(state.linked).toBe(true);
    expect(api.linkSchoolAdminInvite).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual(LINK_RETRY_DELAYS_MS.slice(0, 2));
    expect(api.createSchoolProfile).toHaveBeenCalledTimes(1);
    expect(api.createInvite).toHaveBeenCalledTimes(1);
  });

  it("stops after the bounded retries; the failure can be retried by hand without a second school or invite", async () => {
    const api = fakeApi({ linkSchoolAdminInvite: vi.fn().mockRejectedValue(serviceError(404, "SCH_006")) });
    const onStep = vi.fn();

    const first = await runInvitationSteps(values, {}, api, onStep, noWait);
    expect(first.outcome).toMatchObject({ type: "failed", step: STEP.LINK, retryable: true });
    expect(first.state).toMatchObject({ schoolProfileId: "school-1", invite: sentInvite, linked: false });
    expect(api.linkSchoolAdminInvite).toHaveBeenCalledTimes(LINK_RETRY_DELAYS_MS.length + 1);
    expect(onStep.mock.calls.at(-1).slice(0, 2)).toEqual([STEP.LINK, "failed"]);

    api.linkSchoolAdminInvite.mockReset().mockResolvedValue({ status: 204 });
    const retry = await runInvitationSteps(values, first.state, api, undefined, noWait);
    expect(retry.outcome).toEqual({ type: "linked" });
    expect(api.createSchoolProfile).toHaveBeenCalledTimes(1);
    expect(api.createInvite).toHaveBeenCalledTimes(1);
    expect(api.resendInvite).not.toHaveBeenCalled();
  });

  it.each([
    ["409 SCH_007 (school already has an admin)", serviceError(409, "SCH_007")],
    ["409 SCH_008 (invite linked to another school)", serviceError(409, "SCH_008")],
    ["409 SCH_009 (user already manages a school)", serviceError(409, "SCH_009")],
    ["403 (not a Platform Admin)", serviceError(403)],
    ["401 (session ended)", serviceError(401)],
    ["400", serviceError(400, "VAL_001")],
    ["404 without SCH_006", serviceError(404)],
  ])("%s → tried once, not retryable, never reported as linked", async (_label, error) => {
    const api = fakeApi({ linkSchoolAdminInvite: vi.fn().mockRejectedValue(error) });

    const { state, outcome } = await runInvitationSteps(values, {}, api, undefined, noWait);

    expect(outcome).toEqual({ type: "failed", step: STEP.LINK, error, retryable: false });
    expect(state.linked).toBe(false);
    expect(api.linkSchoolAdminInvite).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["network failure", { isAxiosError: true, message: "Network Error" }],
    ["HTTP 500", serviceError(500, "SYS_001")],
    ["HTTP 503", serviceError(503)],
  ])("%s → not retried automatically, but retryable by hand", async (_label, error) => {
    const api = fakeApi({ linkSchoolAdminInvite: vi.fn().mockRejectedValue(error) });

    const { outcome } = await runInvitationSteps(values, {}, api, undefined, noWait);

    expect(outcome).toMatchObject({ type: "failed", step: STEP.LINK, retryable: true });
    expect(api.linkSchoolAdminInvite).toHaveBeenCalledTimes(1);
  });

  it("an invite without an inviteId is not linked to anything", async () => {
    const api = fakeApi({ createInvite: vi.fn().mockResolvedValue({ ...sentInvite, inviteId: undefined }) });

    const { outcome } = await runInvitationSteps(values, {}, api, undefined, noWait);

    expect(outcome).toMatchObject({ type: "failed", step: STEP.LINK, retryable: false });
    expect(api.linkSchoolAdminInvite).not.toHaveBeenCalled();
  });

  it("links the invite that was actually reused after a lost create response", async () => {
    const api = fakeApi({
      createInvite: vi.fn().mockRejectedValue(new ApiError(0, "NETWORK_ERROR", "Unable to reach the server.")),
      listInvites: vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([{ ...sentInvite, inviteId: "inv-lost" }]),
      resendInvite: vi.fn().mockResolvedValue({ ...sentInvite, inviteId: "inv-lost" }),
    });

    const first = await runInvitationSteps(values, {}, api, undefined, noWait);
    const retry = await runInvitationSteps(values, first.state, api, undefined, noWait);

    expect(retry.outcome).toEqual({ type: "linked" });
    expect(api.linkSchoolAdminInvite).toHaveBeenCalledTimes(1);
    expect(api.linkSchoolAdminInvite).toHaveBeenCalledWith("school-1", "inv-lost");
  });

  it("isLinkRetryable also reads Signup-style ApiErrors", () => {
    expect(isLinkRetryable(new ApiError(404, "SCH_006", "not found"))).toBe(true);
    expect(isLinkRetryable(new ApiError(409, "SCH_008", "conflict"))).toBe(false);
  });
});

describe("checkInvitationStatus", () => {
  const flow = { schoolProfileId: "school-1", invite: sentInvite };

  it("reports Signup's status of this invite and whether the school has its admin", async () => {
    const api = {
      listInvites: vi.fn().mockResolvedValue([
        { ...sentInvite, inviteId: "other", status: "PENDING" },
        { ...sentInvite, status: "ACCEPTED" },
      ]),
      getSchoolProfile: vi.fn().mockResolvedValue({ data: { schoolProfileId: "school-1", schoolAdminId: "user-1" } }),
    };

    await expect(checkInvitationStatus(api, flow)).resolves.toEqual({ inviteStatus: "ACCEPTED", adminAssigned: true });
    expect(api.getSchoolProfile).toHaveBeenCalledWith("school-1");
  });

  it("accepted but not assigned yet, or an invite missing from the list", async () => {
    const pendingSchool = vi.fn().mockResolvedValue({ data: { schoolProfileId: "school-1" } });

    await expect(
      checkInvitationStatus(
        { listInvites: vi.fn().mockResolvedValue([{ ...sentInvite, status: "ACCEPTED" }]), getSchoolProfile: pendingSchool },
        flow,
      ),
    ).resolves.toEqual({ inviteStatus: "ACCEPTED", adminAssigned: false });
    await expect(
      checkInvitationStatus({ listInvites: vi.fn().mockResolvedValue([]), getSchoolProfile: pendingSchool }, flow),
    ).resolves.toEqual({ inviteStatus: null, adminAssigned: false });
  });

  it("rejects when a lookup fails, rather than guessing", async () => {
    const api = {
      listInvites: vi.fn().mockRejectedValue(new ApiError(403, "FORBIDDEN", "no")),
      getSchoolProfile: vi.fn().mockResolvedValue({ data: {} }),
    };

    await expect(checkInvitationStatus(api, flow)).rejects.toMatchObject({ status: 403 });
  });
});

describe("isRetryable", () => {
  it("retries network failures, timeouts, rate limits and server errors", () => {
    for (const status of [0, 408, 429, 500, 502, 503, 504]) {
      expect(isRetryable(new ApiError(status, "X", "x"))).toBe(true);
    }
    // No HTTP status at all (e.g. a dropped connection surfaced as a plain Error).
    expect(isRetryable(new Error("Network Error"))).toBe(true);
  });

  it("does not retry client errors", () => {
    for (const status of [400, 401, 403, 404, 409, 410, 422]) {
      expect(isRetryable(new ApiError(status, "X", "x"))).toBe(false);
    }
  });
});
