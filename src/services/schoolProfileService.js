import { Configuration, SchoolProfileApi } from "@skooljobs/school-api";

const BASE_URL =
    import.meta.env.MODE === "development"
        ? "http://localhost:8081"
        : "http://dev.app.skooljobs.com";

const configuration = new Configuration({
    basePath: BASE_URL,
});

const schoolProfileApi = new SchoolProfileApi(configuration);

export const saveSchoolProfile = async (payload) => {
    return schoolProfileApi.createSchoolProfile(payload);
};

export const getSchoolProfile = async (schoolProfileId) => {
    return schoolProfileApi.getSchoolProfileById(schoolProfileId);
};

// POST /school-profiles/update — schoolProfileId travels in the body.
export const updateSchoolProfile = async (payload) => {
    return schoolProfileApi.updateSchoolProfile(payload);
};