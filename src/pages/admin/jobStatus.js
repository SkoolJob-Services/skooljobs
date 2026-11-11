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
