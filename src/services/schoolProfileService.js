import { Configuration, SchoolProfileApi } from "@skooljobs/school-api";
import { serviceHttp } from "../api/httpClient";
import { API_BASE_PATHS } from "./apiConfig";

const configuration = new Configuration({
    basePath: API_BASE_PATHS.schoolProfile,
});

const schoolProfileApi = new SchoolProfileApi(configuration, undefined, serviceHttp);

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