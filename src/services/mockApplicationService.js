import { decodeJwtClaims } from "../features/auth/roles";
import { sessionStore } from "../features/auth/sessionStore";

/**
 * In-browser stand-in for the application service, under `npm run dev:mock` only (see
 * applicationService.js). Applications are kept in localStorage in the service's shapes
 * (ApplicationSummary / InterviewSummary, snake_case); every command answers 202 like the
 * real service and is applied at once.
 */
const APPLICATIONS_KEY = "skooljobs_mock_applications";
const JOBS_KEY = "skooljobs_mock_server_jobs"; // mockJobService's store (read only here)

function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function save(list) {
  try {
    localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(list));
  } catch {
    // storage unavailable
  }
}

const loadApplications = () => load(APPLICATIONS_KEY, []);
const callerId = () => decodeJwtClaims(sessionStore.load()?.accessToken)?.sub || null;
const nowIso = () => new Date().toISOString();
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

function httpError(status, code, message) {
  const error = new Error(message);
  error.response = { status, data: { code, message } };
  return error;
}

const accepted = (message) => ({
  status: 202,
  data: { commandId: crypto.randomUUID(), status: "ACCEPTED", message },
});

function find(list, applicationId) {
  const app = list.find((a) => a.application_id === applicationId);
  if (!app) throw httpError(404, "APP_002", "Application not found.");
  return app;
}

const page = (items, { page: number = 1, limit = 20 } = {}) => ({
  status: 200,
  data: {
    success: true,
    total: items.length,
    page: number,
    limit,
    data: items.slice((number - 1) * limit, number * limit),
  },
});

export const mockApplicationService = {
  async applyToJob({ job_id, resume_id, cover_letter_id }) {
    await delay();
    const teacher = callerId();
    const list = loadApplications();
    if (list.some((a) => a.job_id === job_id && a.teacher_user_id === teacher && a.status !== "withdrawn")) {
      throw httpError(409, "APP_003", "You have already applied to this job.");
    }
    const job = load(JOBS_KEY, []).find((j) => j.jobId === job_id);
    list.unshift({
      application_id: crypto.randomUUID(),
      job_id,
      teacher_user_id: teacher,
      school_id: job?.schoolProfileId || null,
      status: "submitted",
      applied_date: nowIso(),
      updated_at: nowIso(),
      interview_count: 0,
      resume_id,
      cover_letter_id: cover_letter_id || null,
      interviews: [],
    });
    save(list);
    return accepted("Application submitted.");
  },

  async withdrawApplication({ application_id }) {
    await delay();
    const list = loadApplications();
    const app = find(list, application_id);
    if (app.teacher_user_id !== callerId()) throw httpError(403, "APP_010", "Not your application.");
    app.status = "withdrawn";
    app.updated_at = nowIso();
    save(list);
    return accepted("Application withdrawn.");
  },

  async reviewApplication({ application_id, action, notes }) {
    await delay();
    const list = loadApplications();
    const app = find(list, application_id);
    app.status = action === "reject" ? "admin_rejected" : "admin_approved";
    app.admin_review = { action, notes: notes || null, actioned_at: nowIso() };
    app.reviewed_at = nowIso();
    app.updated_at = nowIso();
    save(list);
    return accepted("Review saved.");
  },

  async setApplicationStatus({ application_id, status, school_notes }) {
    await delay();
    const list = loadApplications();
    const app = find(list, application_id);
    app.status = status;
    if (school_notes) app.school_notes = school_notes;
    app.updated_at = nowIso();
    save(list);
    return accepted("Status updated.");
  },

  // Like the real ScheduleInterviewCommand: the interview fields are on the command itself.
  async scheduleInterview({ application_id, interview, ...fields }) {
    await delay();
    const list = loadApplications();
    const app = find(list, application_id);
    const scheduled = {
      ...(interview || fields),
      interview_id: crypto.randomUUID(),
      status: "Scheduled",
      scheduled_by_user_id: callerId(),
      created_at: nowIso(),
    };
    app.interviews = [...(app.interviews || []), scheduled];
    app.interview_count = app.interviews.length;
    app.next_interview = scheduled;
    app.updated_at = nowIso();
    save(list);
    return accepted("Interview scheduled.");
  },

  async updateInterview({ application_id, interview_id, ...changes }) {
    await delay();
    const list = loadApplications();
    const app = find(list, application_id);
    app.interviews = (app.interviews || []).map((iv) =>
      iv.interview_id === interview_id ? { ...iv, ...(changes.interview || changes), updated_at: nowIso() } : iv,
    );
    app.updated_at = nowIso();
    save(list);
    return accepted("Interview updated.");
  },

  async getApplication({ application_id }) {
    await delay(150);
    return { status: 200, data: { success: true, data: find(loadApplications(), application_id) } };
  },

  async listApplications(query = {}) {
    await delay();
    const items = loadApplications()
      .filter((a) => !query.job_id || a.job_id === query.job_id)
      .filter((a) => !query.teacher_user_id || a.teacher_user_id === query.teacher_user_id)
      .filter((a) => !query.school_id || a.school_id === query.school_id)
      .filter((a) => !query.status || a.status === query.status);
    return page(items, query);
  },

  async listInterviews(query = {}) {
    await delay();
    const items = loadApplications()
      .filter((a) => !query.job_id || a.job_id === query.job_id)
      .filter((a) => !query.teacher_user_id || a.teacher_user_id === query.teacher_user_id)
      .filter((a) => !query.school_id || a.school_id === query.school_id)
      .flatMap((a) =>
        (a.interviews || []).map((interview) => ({
          application_id: a.application_id,
          job_id: a.job_id,
          teacher_user_id: a.teacher_user_id,
          school_id: a.school_id,
          application_status: a.status,
          interview,
        })),
      )
      .filter((s) => !query.status || s.interview.status === query.status);
    return page(items, query);
  },
};
