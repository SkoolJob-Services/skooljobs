import { decodeJwtClaims } from "../features/auth/roles";
import { sessionStore } from "../features/auth/sessionStore";

/**
 * In-browser stand-in for the school-profile calls used by the invite flow,
 * under `npm run dev:mock` only (see schoolProfileService.js). Same response
 * shapes as the real service; profiles are kept in localStorage.
 *
 * Like the real service, the caller's school is the one whose linked invite the
 * caller accepted: links are kept here (inviteId → schoolProfileId), invites and
 * their status in mockAuthApi's store, and the caller is the mock token's subject.
 */
const PROFILES_KEY = "skooljobs_mock_school_profiles";
const LINKS_KEY = "skooljobs_mock_school_admin_invitations";
// mockAuthApi's invite store (read only here).
const INVITES_KEY = "skooljobs_mock_invites";

function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function store(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable
  }
}

const loadProfiles = () => load(PROFILES_KEY, {});
const saveProfiles = (profiles) => store(PROFILES_KEY, profiles);

/** Rejects like axios does, so the pages' error handling runs unchanged. */
function httpError(status, message, code) {
  const error = new Error(message);
  error.response = { status, data: { code, message } };
  return error;
}

function accepted(schoolProfileId, message) {
  return {
    data: {
      commandId: crypto.randomUUID(),
      schoolProfileId,
      status: "ACCEPTED",
      message,
      timestamp: new Date().toISOString(),
    },
  };
}

/** The school of the accepted, linked invite sent to the mock caller (subject `mock-<identifier>`). */
function mySchool() {
  const subject = decodeJwtClaims(sessionStore.load()?.accessToken)?.sub;
  const identifier = typeof subject === "string" && subject.startsWith("mock-") ? subject.slice(5) : null;
  const links = load(LINKS_KEY, {});
  const invite = load(INVITES_KEY, []).find(
    (candidate) =>
      candidate.status === "ACCEPTED" &&
      candidate.role === "SCHOOL_ADMIN" &&
      (candidate.target ?? "").trim().toLowerCase() === identifier &&
      links[candidate.inviteId],
  );
  if (!identifier || !invite) throw httpError(404, "School Profile not found.", "SCH_006");
  return { schoolProfileId: links[invite.inviteId] };
}

export const mockSchoolProfileService = {
  async createSchoolProfile(payload) {
    const profiles = loadProfiles();
    const schoolProfileId = crypto.randomUUID();
    profiles[schoolProfileId] = { ...payload, schoolProfileId };
    saveProfiles(profiles);
    return accepted(schoolProfileId, "School Profile command accepted for processing.");
  },

  async getMySchoolProfile() {
    const { schoolProfileId } = mySchool();
    return { data: loadProfiles()[schoolProfileId] ?? { schoolProfileId } };
  },

  // schoolAdminId: the subject of whoever accepted an invite linked to this school.
  async getSchoolProfile(schoolProfileId) {
    const profile = loadProfiles()[schoolProfileId];
    if (!profile) throw httpError(404, "School Profile not found.", "SCH_006");
    const links = load(LINKS_KEY, {});
    const accepted = load(INVITES_KEY, []).find(
      (invite) => invite.status === "ACCEPTED" && links[invite.inviteId] === schoolProfileId,
    );
    const schoolAdminId = accepted ? `mock-${(accepted.target ?? "").trim().toLowerCase()}` : undefined;
    return { data: { ...profile, schoolAdminId } };
  },

  async linkSchoolAdminInvite(schoolProfileId, inviteId) {
    if (!loadProfiles()[schoolProfileId]) throw httpError(404, "School Profile not found.", "SCH_006");
    const links = load(LINKS_KEY, {});
    if (links[inviteId] && links[inviteId] !== schoolProfileId) {
      throw httpError(409, "The invitation is linked to another School Profile.", "SCH_008");
    }
    store(LINKS_KEY, { ...links, [inviteId]: schoolProfileId });
    return { status: 204, data: "" };
  },

  async updateSchoolProfile(payload) {
    const { schoolProfileId } = mySchool();
    if (payload?.schoolProfileId !== schoolProfileId) throw httpError(403, "You can only update your own school.");
    const profiles = loadProfiles();
    profiles[schoolProfileId] = { ...profiles[schoolProfileId], ...payload };
    saveProfiles(profiles);
    return accepted(schoolProfileId, "Profile saved successfully!");
  },
};
