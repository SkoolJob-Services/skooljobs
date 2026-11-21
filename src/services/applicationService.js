import {
    CommandsApi,
    Configuration,
    QueriesApi,
} from "@skooljobs/application-api";
import { serviceHttp } from "../api/httpClient";
import { API_BASE_PATHS } from "./apiConfig";
import { mockApiEnabled } from "../api";
import { mockApplicationService } from "./mockApplicationService";

const configuration = new Configuration({
    basePath: API_BASE_PATHS.application,
});

const commandsApi = new CommandsApi(configuration, undefined, serviceHttp);
const queriesApi = new QueriesApi(configuration, undefined, serviceHttp);

// Under `npm run dev:mock` every call goes to the in-browser mockApplicationService.

// --- Commands (all return CommandAcceptedResponse: { commandId, status, message }) ---

// POST /applications — { job_id, resume_id, cover_letter_id? }
export const applyToJob = async (payload) => {
    if (mockApiEnabled) return mockApplicationService.applyToJob(payload);
    return commandsApi.applyToJob(payload);
};

// POST /applications/withdraw — { application_id }
export const withdrawApplication = async (applicationId) => {
    if (mockApiEnabled) return mockApplicationService.withdrawApplication({ application_id: applicationId });
    return commandsApi.withdrawApplication({ application_id: applicationId });
};

// POST /applications/review — { application_id, action: "approve"|"reject", notes? }
export const reviewApplication = async (payload) => {
    if (mockApiEnabled) return mockApplicationService.reviewApplication(payload);
    return commandsApi.reviewApplication(payload);
};

// POST /applications/status — { application_id, status, school_notes? }
export const setApplicationStatus = async (payload) => {
    if (mockApiEnabled) return mockApplicationService.setApplicationStatus(payload);
    return commandsApi.setApplicationStatus(payload);
};

// POST /applications/interview/schedule — ScheduleInterviewCommand
export const scheduleInterview = async (payload) => {
    if (mockApiEnabled) return mockApplicationService.scheduleInterview(payload);
    return commandsApi.scheduleInterview(payload);
};

// POST /applications/interview/update — UpdateInterviewCommand
export const updateInterview = async (payload) => {
    if (mockApiEnabled) return mockApplicationService.updateInterview(payload);
    return commandsApi.updateInterview(payload);
};

// --- Queries ---

// POST /applications/get — { application_id } -> ApplicationResponse
export const getApplication = async (applicationId) => {
    if (mockApiEnabled) return mockApplicationService.getApplication({ application_id: applicationId });
    return queriesApi.getApplication({ application_id: applicationId });
};

// POST /applications/search — ListApplicationsQuery -> ApplicationListResponse
export const listApplications = async (query = {}) => {
    if (mockApiEnabled) return mockApplicationService.listApplications(query);
    return queriesApi.listApplications(query);
};

// POST /applications/interviews/search — ListInterviewsQuery -> InterviewListResponse
// ({ school_id?, teacher_user_id?, job_id?, status?, from_date?, to_date?, page?, limit? }).
export const listInterviews = async (query = {}) => {
    if (mockApiEnabled) return mockApplicationService.listInterviews(query);
    return queriesApi.listInterviews(query);
};
