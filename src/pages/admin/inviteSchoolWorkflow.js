import { isApiError, statusOf } from "../../api/errors";
import { INVITE_ROLE_CODE } from "../../features/auth/roles";
import { toE164 } from "../../lib/contact";

/**
 * Invite Schools workflow, kept free of React so each step's failure and retry
 * can be tested on its own:
 *
 *   1. school — POST /school-profiles (SchoolProfile) → schoolProfileId
 *   2. invite — POST /invites (Signup) → inviteId + inviteLink
 *   3. link   — PUT /school-profiles/{schoolProfileId}/admin-invitations/{inviteId}
 *               (SchoolProfile): whoever accepts this invite becomes the
 *               school's admin when Signup reports the acceptance.
 *
 * A step that already succeeded is never repeated: retries reuse the stored
 * schoolProfileId and invite, so no second school or invite is created. The
 * link itself is safe to repeat.
 */
export const STEP = { SCHOOL: "school", INVITE: "invite", LINK: "link" };

/**
 * Step 1 answers 202: the school is stored asynchronously, so linking right
 * after it can find no school yet (404 SCH_006). Only that is retried
 * automatically, with these waits between attempts (about 15 s in all).
 */
export const LINK_RETRY_DELAYS_MS = [1000, 2000, 3000, 4000, 5000];

const SCHOOL_NOT_FOUND = "SCH_006";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** HTTP status of an ApiError (signup client) or an axios error (service clients); 0 without a response. */
export function httpStatusOf(error) {
  if (isApiError(error)) return error.status;
  return error?.response?.status ?? 0;
}

/** Backend error code ({ code } of the ErrorResponse), if any. */
export function errorCodeOf(error) {
  if (isApiError(error)) return error.code;
  const code = error?.response?.data?.code;
  return typeof code === "string" ? code : undefined;
}

/** The school isn't stored yet (or doesn't exist): the only error retried automatically. */
export const isSchoolNotStoredYet = (error) =>
  httpStatusOf(error) === 404 && errorCodeOf(error) === SCHOOL_NOT_FOUND;

export const normalizeEmail = (email) => email.trim().toLowerCase();

/** Only fields the SchoolProfile `SchoolProfile` schema defines; contact needs email + phone. */
export function buildSchoolRequest(values) {
  return {
    schoolName: values.schoolName.trim(),
    contact: {
      email: normalizeEmail(values.email),
      phone: toE164(values.countryCode, values.phone),
    },
  };
}

/** Only fields of the Signup `CreateInviteRequest` contract. */
export function buildInviteRequest(values) {
  return {
    role: INVITE_ROLE_CODE.SCHOOL_ADMIN,
    channel: "EMAIL",
    target: normalizeEmail(values.email),
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
  };
}

/**
 * A pending school-admin invite the caller already sent to this email, if any.
 * Best effort: GET /invites lists only the caller's own invites (all of them
 * with invite:read:any), and a failed lookup never blocks sending.
 */
export async function findPendingInvite(api, email) {
  try {
    const invites = await api.listInvites("PENDING");
    const target = normalizeEmail(email);
    return (
      invites.find(
        (invite) =>
          invite.status === "PENDING" &&
          invite.role === INVITE_ROLE_CODE.SCHOOL_ADMIN &&
          normalizeEmail(invite.target ?? "") === target,
      ) ?? null
    );
  } catch {
    return null;
  }
}

/**
 * Runs the steps that haven't succeeded yet.
 *
 * state: { schoolProfileId, invite, inviteAttempted, linked }
 * api:   { createSchoolProfile, createInvite, listInvites, resendInvite, linkSchoolAdminInvite }
 * onStep(step, status, state) reports "running" / "done" / "failed" / "accepted"
 * (school accepted without an id) and what exists so far.
 * options: { linkRetryDelaysMs, sleep } (tests shorten the waits)
 *
 * Resolves to { state, outcome } where outcome is one of:
 *   { type: "duplicate", existing }               nothing created (pending invite already exists)
 *   { type: "noSchoolId" }                        school request accepted (202) without an id; stopped
 *   { type: "failed", step, error, retryable }    stopped at `step`
 *   { type: "linked" }                            school, invite and link all done
 */
export async function runInvitationSteps(values, initialState, api, onStep = () => {}, options = {}) {
  let state = { schoolProfileId: null, invite: null, inviteAttempted: false, linked: false, ...initialState };

  if (!state.schoolProfileId) {
    // Before creating anything: an invite already pending for this email would
    // leave a second school and a second invite.
    const existing = await findPendingInvite(api, values.email);
    if (existing) return { state, outcome: { type: "duplicate", existing } };

    onStep(STEP.SCHOOL, "running", state);
    let response;
    try {
      response = await api.createSchoolProfile(buildSchoolRequest(values));
    } catch (error) {
      onStep(STEP.SCHOOL, "failed", state);
      return { state, outcome: { type: "failed", step: STEP.SCHOOL, error, retryable: true } };
    }
    const schoolProfileId = response?.data?.schoolProfileId;
    if (!schoolProfileId) {
      // Accepted (202) but without an id: not a failure — the school may now
      // exist, so a retry could create a second one, and no invite can be tied to it.
      onStep(STEP.SCHOOL, "accepted", state);
      return { state, outcome: { type: "noSchoolId" } };
    }
    state = { ...state, schoolProfileId };
    onStep(STEP.SCHOOL, "done", state);
  }

  if (!state.invite) {
    onStep(STEP.INVITE, "running", state);
    try {
      // On a retry the earlier request may have been created even though its
      // response was lost; reuse that invite (resend issues a fresh link).
      const earlier = state.inviteAttempted ? await findPendingInvite(api, values.email) : null;
      const invite = earlier
        ? await api.resendInvite(earlier.inviteId)
        : await api.createInvite(buildInviteRequest(values));
      state = { ...state, invite };
      onStep(STEP.INVITE, "done", state);
    } catch (error) {
      state = { ...state, inviteAttempted: true };
      onStep(STEP.INVITE, "failed", state);
      return { state, outcome: { type: "failed", step: STEP.INVITE, error, retryable: isRetryable(error) } };
    }
  }

  if (!state.linked) {
    onStep(STEP.LINK, "running", state);
    const inviteId = state.invite?.inviteId;
    if (!inviteId) {
      // Signup always returns one; without it there is nothing to link.
      onStep(STEP.LINK, "failed", state);
      const error = new Error("The invite service didn't return an invitation ID.");
      return { state, outcome: { type: "failed", step: STEP.LINK, error, retryable: false } };
    }
    try {
      await linkWhenSchoolIsStored(api, state.schoolProfileId, inviteId, options);
    } catch (error) {
      onStep(STEP.LINK, "failed", state);
      return { state, outcome: { type: "failed", step: STEP.LINK, error, retryable: isLinkRetryable(error) } };
    }
    state = { ...state, linked: true };
    onStep(STEP.LINK, "done", state);
  }

  return { state, outcome: { type: "linked" } };
}

/** Links, waiting out the asynchronous school creation (404 SCH_006) a bounded number of times. */
async function linkWhenSchoolIsStored(api, schoolProfileId, inviteId, options) {
  const delays = options.linkRetryDelaysMs ?? LINK_RETRY_DELAYS_MS;
  const wait = options.sleep ?? sleep;
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await api.linkSchoolAdminInvite(schoolProfileId, inviteId);
    } catch (error) {
      if (!isSchoolNotStoredYet(error) || attempt >= delays.length) throw error;
      await wait(delays[attempt]);
    }
  }
}

/**
 * A failed link is worth retrying by hand when nothing was wrong with the
 * request: no response, 408, 429, 5xx, or the school still not stored after
 * the automatic retries. 400/401/403/409 fail the same way again.
 */
export function isLinkRetryable(error) {
  if (isSchoolNotStoredYet(error)) return true;
  const status = httpStatusOf(error);
  return status === 0 || status === 408 || status === 429 || status >= 500;
}

/**
 * Where an invitation stands after it was sent, from the services themselves:
 *   inviteStatus  — Signup's status of the invite (PENDING, ACCEPTED, EXPIRED, REVOKED),
 *                   null when the caller's invite list doesn't contain it
 *   adminAssigned — the school has its School Admin (SchoolProfile set schoolAdminId
 *                   after Signup reported the acceptance)
 * api: { listInvites, getSchoolProfile }. Rejects when either lookup fails.
 */
export async function checkInvitationStatus(api, { schoolProfileId, invite }) {
  const [invites, school] = await Promise.all([api.listInvites(), api.getSchoolProfile(schoolProfileId)]);
  const current = invites.find((candidate) => candidate.inviteId === invite.inviteId);
  return {
    inviteStatus: current?.status ?? null,
    adminAssigned: Boolean(school?.data?.schoolAdminId),
  };
}

/**
 * Worth retrying unchanged: no response at all (network), 408, 429 or 5xx.
 * Other 4xx (400 invalid, 403 not allowed, 409 conflict…) fail the same way again.
 */
export function isRetryable(error) {
  const status = statusOf(error);
  return status === 0 || status === 408 || status === 429 || status >= 500;
}
