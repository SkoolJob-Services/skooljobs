import { decodeJwtClaims } from "../features/auth/roles";
import { sessionStore } from "../features/auth/sessionStore";

/**
 * In-browser stand-in for the job service, under `npm run dev:mock` only (see jobService.js).
 * Jobs are kept in localStorage as JobResponse objects and follow the same rules as the
 * service: a new job waits for review (PENDING_APPROVAL / PENDING) unless it is a draft or the
 * poster is the ADMIN; APPROVED → ACTIVE (SCHEDULED until publishAt); REJECTED → DRAFT.
 * A few sample jobs waiting for review are added the first time, so Job Approvals has work.
 */
const JOBS_KEY = "skooljobs_mock_server_jobs";

const DRAFT_OPTIONS = ["DRAFT", "SAVE AS DRAFT"];
const SETTABLE = ["DRAFT", "PENDING_APPROVAL", "SCHEDULED", "ACTIVE", "PAUSED", "CLOSED"];

const nowIso = () => new Date().toISOString();
const today = () => nowIso().slice(0, 10);
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

function sample(n, title, subject, schoolName, location) {
  const createdAt = daysAgo(n);
  return {
    jobId: `00000000-0000-4000-8000-00000000000${n}`,
    schoolProfileId: `00000000-0000-4000-9000-00000000000${n}`,
    schoolName,
    postedByUserId: null,
    title,
    subject,
    roleCategory: "Secondary",
    employmentType: "Full Time",
    location,
    experienceRequired: "3 - 5 Years",
    compensation: "₹4,00,000 – ₹6,00,000 per annum",
    vacancies: 1,
    description: `We are hiring a ${title} to teach ${subject}.`,
    publishOption: "Publish Immediately",
    status: "PENDING_APPROVAL",
    adminReviewStatus: "PENDING",
    applicantsCount: 0,
    postedDate: createdAt.slice(0, 10),
    createdAt,
    updatedAt: createdAt,
  };
}

const SAMPLES = [
  sample(1, "PGT Mathematics Teacher", "Mathematics", "Sunrise International School", "Bhopal"),
  sample(2, "TGT Science Teacher", "Science", "Green Valley School", "Indore"),
  sample(3, "Primary English Teacher", "English", "Delhi Public Learning Academy", "Ujjain"),
];

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(JOBS_KEY) || "null");
    if (Array.isArray(saved)) return saved;
  } catch {
    // damaged: start again from the samples
  }
  save(SAMPLES);
  return [...SAMPLES];
}

function save(list) {
  try {
    localStorage.setItem(JOBS_KEY, JSON.stringify(list));
  } catch {
    // storage unavailable
  }
}

/** The signed-in user (mock or local token): id and roles. */
function caller() {
  const claims = decodeJwtClaims(sessionStore.load()?.accessToken) || {};
  const roles = [].concat(claims.roles || claims.role || []);
  return { userId: claims.sub || null, isAdmin: roles.includes("ADMIN") };
}

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

/** Rejects like axios does, so the pages' error handling runs unchanged. */
function httpError(status, code, message) {
  const error = new Error(message);
  error.response = { status, data: { code, message } };
  return error;
}

const accepted = (message, extra = {}) => ({
  status: 202,
  data: { commandId: crypto.randomUUID(), status: "ACCEPTED", message, ...extra },
});

function find(list, jobId) {
  const job = list.find((j) => j.jobId === jobId);
  if (!job) throw httpError(404, "JOB_002", `Job ${jobId} not found.`);
  return job;
}

const isFuture = (iso) => !!iso && new Date(iso) > new Date();

export const mockJobService = {
  async listJobs({ schoolProfileId, postedByUserId, status, adminReviewStatus } = {}) {
    await delay();
    const list = load()
      .filter((j) => !schoolProfileId || j.schoolProfileId === schoolProfileId)
      .filter((j) => !postedByUserId || j.postedByUserId === postedByUserId)
      .filter((j) => !status || j.status === status)
      .filter((j) => !adminReviewStatus || j.adminReviewStatus === adminReviewStatus)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return { status: 200, data: list };
  },

  async getJobById(jobId) {
    await delay(150);
    return { status: 200, data: find(load(), jobId) };
  },

  async manageJob(request) {
    await delay();
    const list = load();
    const action = String(request.action || "").toUpperCase();
    const { userId, isAdmin } = caller();

    if (action === "CREATE") {
      if (!request.title?.trim()) throw httpError(400, "JOB_001", "title is required.");
      const draft = DRAFT_OPTIONS.includes(String(request.publishOption || "").toUpperCase());
      const approved = isAdmin && !draft;
      const job = {
        ...request,
        action: undefined,
        jobId: crypto.randomUUID(),
        postedByUserId: userId,
        status: draft ? "DRAFT" : approved ? (isFuture(request.publishAt) ? "SCHEDULED" : "ACTIVE") : "PENDING_APPROVAL",
        adminReviewStatus: approved ? "APPROVED" : "PENDING",
        applicantsCount: 0,
        postedDate: today(),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      list.unshift(job);
      save(list);
      return accepted(`Job creation accepted for processing. jobId=${job.jobId}`);
    }

    const job = find(list, request.jobId);
    if (action === "UPDATE") {
      Object.entries(request).forEach(([key, value]) => {
        if (!["action", "jobId", "status", "adminReviewStatus"].includes(key) && value !== undefined && value !== null) {
          job[key] = value;
        }
      });
      job.updatedAt = nowIso();
      save(list);
      return accepted("Job update accepted for processing.");
    }
    if (action === "DELETE") {
      save(list.filter((j) => j !== job));
      return accepted("Job deletion accepted for processing.");
    }
    throw httpError(400, "JOB_001", "action must be CREATE, UPDATE or DELETE.");
  },

  async reviewJob({ jobId, decision, rejectionReason }) {
    await delay();
    if (!caller().isAdmin) throw httpError(403, "JOB_004", "Only an ADMIN can review jobs.");
    const list = load();
    const job = find(list, jobId);
    if (job.status !== "PENDING_APPROVAL" || job.adminReviewStatus !== "PENDING") {
      throw httpError(409, "JOB_005", "Job is not waiting for review.");
    }
    const choice = String(decision || "").toUpperCase();
    if (choice === "APPROVED") {
      job.adminReviewStatus = "APPROVED";
      job.adminRejectionReason = null;
      job.status = isFuture(job.publishAt) ? "SCHEDULED" : "ACTIVE";
    } else if (choice === "REJECTED") {
      if (!rejectionReason?.trim()) throw httpError(400, "JOB_001", "rejectionReason is required to reject a job.");
      job.adminReviewStatus = "REJECTED";
      job.adminRejectionReason = rejectionReason.trim();
      job.status = "DRAFT";
    } else {
      throw httpError(400, "JOB_001", "decision must be APPROVED or REJECTED.");
    }
    job.updatedAt = nowIso();
    save(list);
    return accepted("Job review accepted for processing.");
  },

  async changeJobStatus({ jobId, status, publishAt, expiryDate }) {
    await delay();
    const list = load();
    const job = find(list, jobId);
    const target = String(status || "").toUpperCase();
    if (!SETTABLE.includes(target)) throw httpError(400, "JOB_001", "This status can't be set.");
    const conflict = (why) => httpError(409, "JOB_005", `Cannot change job status from ${job.status} to ${target}: ${why}.`);
    if ((target === "ACTIVE" || target === "SCHEDULED") && job.adminReviewStatus !== "APPROVED") {
      throw conflict("the job is not approved yet");
    }
    if (target === "PENDING_APPROVAL" && job.status !== "DRAFT") throw conflict("only a DRAFT can be sent for approval");
    if (target === "DRAFT" && job.status !== "PENDING_APPROVAL") throw conflict("only a job waiting for approval can go back to DRAFT");
    if (target === "PAUSED" && job.status !== "ACTIVE") throw conflict("only an ACTIVE job can be paused");
    if (publishAt) job.publishAt = publishAt;
    if (expiryDate) job.expiryDate = expiryDate;
    if (target === "PENDING_APPROVAL") {
      job.adminReviewStatus = "PENDING";
      job.adminRejectionReason = null;
    }
    job.status = target;
    job.updatedAt = nowIso();
    save(list);
    return accepted("Job status change accepted for processing.");
  },
};
