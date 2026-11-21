import { Configuration, JobApi } from "@skooljobs/job-api";
import { serviceHttp } from "../api/httpClient";
import { API_BASE_PATHS } from "./apiConfig";
import { mockApiEnabled } from "../api";
import { mockJobService } from "./mockJobService";

const configuration = new Configuration({
    basePath: API_BASE_PATHS.job,
});

const jobApi = new JobApi(configuration, undefined, serviceHttp);

// Job API (job-contracts): every change is a command on job.command and answers 202
// { commandId, status: "ACCEPTED", message }; the job service stores it a moment later.
// One endpoint, POST /jobs (operationId manageJob), does CREATE / UPDATE / DELETE by "action".
// Under `npm run dev:mock` every call goes to the in-browser mockJobService (never in a production build).

const manage = (request) => (mockApiEnabled ? mockJobService.manageJob(request) : jobApi.manageJob(request));

// POST /jobs action CREATE. schoolProfileId may be left out: the service then uses the
// school the caller runs (School Admin) or belongs to (member). postedByUserId comes from the token.
export const createJob = async (payload) => {
    return manage({ ...payload, action: "CREATE" });
};

// POST /jobs action UPDATE — content fields only; fields left out keep their value.
// Status changes go through changeJobStatus.
export const updateJob = async (jobId, payload) => {
    return manage({ ...payload, action: "UPDATE", jobId });
};

// POST /jobs action DELETE
export const deleteJob = async (jobId) => {
    return manage({ action: "DELETE", jobId });
};

// GET /jobs — the caller's tenant, newest first. Filters are optional: { schoolProfileId,
// postedByUserId, status, adminReviewStatus }. Teachers see only approved, live jobs;
// a school also sees its own jobs in every status; ADMIN sees all.
export const listJobs = async (filters = {}) => {
    if (mockApiEnabled) return mockJobService.listJobs(filters);
    return jobApi.listJobs(
        filters.schoolProfileId,
        filters.postedByUserId,
        filters.status,
        filters.adminReviewStatus,
    );
};

// GET /jobs/{jobId}
export const getJobById = async (jobId) => {
    if (mockApiEnabled) return mockJobService.getJobById(jobId);
    return jobApi.getJobById(jobId);
};

// POST /jobs/review (ADMIN): decision APPROVED | REJECTED (rejectionReason required).
export const reviewJob = async (jobId, decision, rejectionReason) => {
    if (mockApiEnabled) return mockJobService.reviewJob({ jobId, decision, rejectionReason });
    return jobApi.reviewJob({ jobId, decision, rejectionReason });
};

// POST /jobs/status: ACTIVE, SCHEDULED (with publishAt), PAUSED, CLOSED, PENDING_APPROVAL
// (send a draft for approval), DRAFT. Publishing needs the admin's approval first.
export const changeJobStatus = async (jobId, status, { publishAt, expiryDate } = {}) => {
    if (mockApiEnabled) return mockJobService.changeJobStatus({ jobId, status, publishAt, expiryDate });
    return jobApi.changeJobStatus({ jobId, status, publishAt, expiryDate });
};
