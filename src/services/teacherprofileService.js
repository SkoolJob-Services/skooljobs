import { Configuration, TeacherApi } from "@skooljobs/teacher-api";

const BASE_URL =
    import.meta.env.MODE === "development"
        ? "http://localhost:8086"
        : "http://dev.app.skooljobs.com";

const configuration = new Configuration({
    basePath: BASE_URL,
});

const teacherApi = new TeacherApi(configuration);

export const saveTeacher = async (payload) => {
    return teacherApi.createTeacher(payload);
};