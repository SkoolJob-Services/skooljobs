import { Configuration, TeacherApi } from "@skooljobs/teacher-api";
import { serviceHttp } from "../api/httpClient";
import { API_BASE_PATHS } from "./apiConfig";
import { mockApiEnabled } from "../api";
import { mockTeacherService } from "./mockTeacherService";

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
// GET /teachers/search — Teacher[] filtered by name, subject, city, qualification and
// status (ACTIVE | INACTIVE | DELETED); every filter is optional.
// Admin → Teachers uses the in-browser mock under `npm run dev:mock` (never in a production build).
export const searchTeachers = async ({ name, subject, city, qualification, status } = {}) => {
    if (mockApiEnabled) return mockTeacherService.searchTeachers({ name, subject, city, qualification, status });
    return teacherApi.searchTeachers(
        name || undefined,
        subject || undefined,
        city || undefined,
        qualification || undefined,
        status || undefined,
    );
};

// POST /teachers — create a teacher profile (the service generates teacher_id). 202.
export const createTeacherProfile = async (teacher) => {
    if (mockApiEnabled) return mockTeacherService.createTeacher(teacher);
    return teacherApi.createTeacher(teacher);
};

// POST /teachers/update by the ADMIN (Admin → Teachers): any teacher, by teacherId.
export const adminUpdateTeacher = async (teacher) => {
    if (mockApiEnabled) return mockTeacherService.updateTeacher(teacher);
    return teacherApi.updateTeacher(teacher);
};

/*
 * Login status of a teacher (teacher-profile → CHANGE_USER_STATUS command → signup). The profile
 * and its details are always kept; each call answers 202 and the change follows a moment later.
 */

// POST /teachers/delete — the teacher closes their own account: profile DELETED, login suspended.
export const deleteOwnAccount = async (teacherId) => {
    if (mockApiEnabled) return mockTeacherService.setStatus(teacherId, "DELETED");
    return teacherApi.deleteTeacher({ teacher_id: teacherId });
};

// POST /teachers/deactivate — ADMIN only: profile INACTIVE, login suspended.
export const deactivateTeacher = async (teacherId) => {
    if (mockApiEnabled) return mockTeacherService.setStatus(teacherId, "INACTIVE");
    return teacherApi.deactivateTeacher({ teacher_id: teacherId });
};

// POST /teachers/activate — ADMIN only: profile ACTIVE, login allowed again (also after a delete).
export const activateTeacher = async (teacherId) => {
    if (mockApiEnabled) return mockTeacherService.setStatus(teacherId, "ACTIVE");
    return teacherApi.activateTeacher({ teacher_id: teacherId });
};
