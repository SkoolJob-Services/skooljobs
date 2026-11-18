// Job statuses as the school pages write them to the shared "skooljobs_jobs" list.
export const PENDING = "Pending Approval";
export const APPROVED_STATUSES = ["Approved", "Active", "Scheduled"];
export const LIVE_STATUSES = ["Active", "Scheduled"];
export const REJECTED = "Rejected";

/** AdminUi.module.css chip class for a job status. */
export function statusChipClass(status, ui) {
  if (status === PENDING) return ui.chipPending;
  if (status === "Approved") return ui.chipApproved;
  if (LIVE_STATUSES.includes(status)) return ui.chipLive;
  if (status === REJECTED) return ui.chipRejected;
  return ui.chipNeutral;
}

// ---------------------------------------------------------------------------
// Jobs from the job service (GET /jobs, JobResponse) for the admin pages.
// ---------------------------------------------------------------------------

const SERVER_STATUS_DISPLAY = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  ACTIVE: "Active",
  PAUSED: "Paused",
  CLOSED: "Closed",
  EXPIRED: "Expired",
};

/**
 * Display status of a JobResponse: waiting for the admin (PENDING_APPROVAL / PENDING) is
 * "Pending Approval"; a rejected job (back in DRAFT) is "Rejected"; otherwise its lifecycle status.
 */
export function serverJobStatus(job) {
  if (job.status === "PENDING_APPROVAL" && job.adminReviewStatus === "PENDING") return PENDING;
  if (job.adminReviewStatus === "REJECTED") return REJECTED;
  if (job.status === "PENDING_APPROVAL") return PENDING;
  return SERVER_STATUS_DISPLAY[job.status] || job.status || "—";
}

/** JobResponse → the fields the admin tables show (same names as the local jobs list). */
export function fromJobResponse(job) {
  return {
    id: job.jobId,
    fromServer: true,
    review: job.adminReviewStatus,
    serverStatus: job.status,
    title: job.title,
    subject: job.subject,
    roleType: job.roleCategory,
    employmentType: job.employmentType,
    location: job.location,
    experience: job.experienceRequired,
    vacancies: job.vacancies,
    salaryRange: job.compensation,
    description: job.description,
    schoolName: job.schoolName,
    schoolProfileId: job.schoolProfileId,
    requestedStatus: job.publishOption,
    publishAt: job.publishAt,
    status: serverJobStatus(job),
    rejectionReason: job.adminRejectionReason || "",
    date: job.postedDate || (job.createdAt ? String(job.createdAt).slice(0, 10) : ""),
    createdAt: job.createdAt,
  };
}
