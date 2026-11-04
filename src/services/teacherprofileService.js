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