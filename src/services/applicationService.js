import {
    CommandsApi,
    Configuration,
    QueriesApi,
} from "@skooljobs/application-api";
import { API_BASE_PATHS } from "./apiConfig";

const configuration = new Configuration({
    basePath: API_BASE_PATHS.application,
});

const commandsApi = new CommandsApi(configuration);
const queriesApi = new QueriesApi(configuration);

// --- Commands (all return CommandAcceptedResponse: { commandId, status, message }) ---

// POST /applications — { job_id, resume_id, cover_letter_id? }
export const applyToJob = async (payload) => {
    return commandsApi.applyToJob(payload);
};

// POST /applications/withdraw — { application_id }
export const withdrawApplication = async (applicationId) => {
    return commandsApi.withdrawApplication({ application_id: applicationId });
};

// POST /applications/review — { application_id, action: "approve"|"reject", notes? }
export const reviewApplication = async (payload) => {
    return commandsApi.reviewApplication(payload);
};

// POST /applications/status — { application_id, status, school_notes? }
export const setApplicationStatus = async (payload) => {
    return commandsApi.setApplicationStatus(payload);
};

// POST /applications/interview/schedule — ScheduleInterviewCommand
export const scheduleInterview = async (payload) => {
    return commandsApi.scheduleInterview(payload);
};

// POST /applications/interview/update — UpdateInterviewCommand
export const updateInterview = async (payload) => {
    return commandsApi.updateInterview(payload);
};

// --- Queries ---

// POST /applications/get — { application_id } -> ApplicationResponse
export const getApplication = async (applicationId) => {
    return queriesApi.getApplication({ application_id: applicationId });
};

// POST /applications/search — ListApplicationsQuery -> ApplicationListResponse
export const listApplications = async (query = {}) => {
    return queriesApi.listApplications(query);
};
