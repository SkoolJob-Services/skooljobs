import { Configuration, JobApi } from "@skooljobs/job-api";
import { serviceHttp } from "../api/httpClient";
import { API_BASE_PATHS } from "./apiConfig";

const configuration = new Configuration({
    basePath: API_BASE_PATHS.job,
});

const jobApi = new JobApi(configuration, undefined, serviceHttp);

export const createJob = async (payload) => {
    return jobApi.createJob(payload);
};

// The published @skooljobs/job-api client (0.0.1-SNAPSHOT) was generated
// before listJobs/getJobById/manageJob's UPDATE+DELETE actions were added
// to job.yml, so it only exposes createJob. These call the same real,
// already-implemented backend endpoints directly until the client package
// is regenerated/republished (a backend/build-pipeline task, not done here).

// GET /jobs — returns every job across all schools; callers filter by
// schoolProfileId client-side (the backend has no school-scoped list filter).
export const listJobs = async () => {
    return serviceHttp.get(`${API_BASE_PATHS.job}/jobs`);
};

// GET /jobs/{jobId}
export const getJobById = async (jobId) => {
    return serviceHttp.get(`${API_BASE_PATHS.job}/jobs/${jobId}`);
};

// POST /jobs with action: "UPDATE" — content fields only (title, subject,
// location, employmentType, experienceRequired, vacancies, compensation,
// description, requirements, qualificationsRequired, ...). UpdateJobRequest
// has no status field, so job status transitions cannot be sent this way.
export const updateJob = async (jobId, payload) => {
    return serviceHttp.post(`${API_BASE_PATHS.job}/jobs`, {
        ...payload,
        action: "UPDATE",
        jobId,
    });
};

// POST /jobs with action: "DELETE"
export const deleteJob = async (jobId) => {
    return serviceHttp.post(`${API_BASE_PATHS.job}/jobs`, {
        action: "DELETE",
        jobId,
    });
};
