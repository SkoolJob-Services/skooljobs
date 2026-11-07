import { Configuration, TeacherApi } from "@skooljobs/teacher-api";
import { serviceHttp } from "../api/httpClient";
import { API_BASE_PATHS } from "./apiConfig";

const configuration = new Configuration({
    basePath: API_BASE_PATHS.teacherProfile,
});

const teacherApi = new TeacherApi(configuration, undefined, serviceHttp);

export const saveTeacher = async (payload) => {
    return teacherApi.createTeacher(payload);
};

// POST /teachers/update — teacher_id is mandatory inside the payload body.
export const updateTeacherProfile = async (payload) => {
    return teacherApi.updateTeacher(payload);
};

// GET /teachers/me — identity comes from the validated JWT, never a
// client-supplied parameter. The published @skooljobs/teacher-api client
// (0.0.1-SNAPSHOT) predates this endpoint (it only exposes getTeacherByEmail,
// now removed on the backend), so this calls the real, already-implemented
// endpoint directly until the client package is regenerated/republished
// (a backend/build-pipeline task, not done here) — same pattern as
// jobService.js's listJobs/getJobById bypass.
export const getOwnTeacherProfile = async () => {
    return serviceHttp.get(`${API_BASE_PATHS.teacherProfile}/teachers/me`);
};