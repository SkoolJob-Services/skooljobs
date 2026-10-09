import { Configuration, TeacherApi } from "@skooljobs/teacher-api";
import { API_BASE_PATHS } from "./apiConfig";

const configuration = new Configuration({
    basePath: API_BASE_PATHS.teacherProfile,
});

const teacherApi = new TeacherApi(configuration);

export const saveTeacher = async (payload) => {
    return teacherApi.createTeacher(payload);
};