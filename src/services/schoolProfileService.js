import { Configuration, SchoolProfileApi } from "@skooljobs/schoolprofile-api";
import { serviceHttp } from "../api/httpClient";
import { mockApiEnabled } from "../api";
import { API_BASE_PATHS } from "./apiConfig";
import { mockSchoolProfileService } from "./mockSchoolProfileService";

const configuration = new Configuration({
    basePath: API_BASE_PATHS.schoolProfile,
});

const schoolProfileApi = new SchoolProfileApi(configuration, undefined, serviceHttp);

export const saveSchoolProfile = async (payload) => {
    return schoolProfileApi.createSchoolProfile(payload);
};

export const getSchoolProfile = async (schoolProfileId) => {
    if (mockApiEnabled) return mockSchoolProfileService.getSchoolProfile(schoolProfileId);
    return schoolProfileApi.getSchoolProfileById(schoolProfileId);
};

// The invite flow's calls use the in-browser mock under `npm run dev:mock` (never in a production build).

// POST /school-profiles — 202 CommandAcceptedResponse; the school is saved asynchronously.
// The new id is data.schoolProfileId (absent on backends that don't generate it).
export const createSchoolProfile = async (payload) => {
    if (mockApiEnabled) return mockSchoolProfileService.createSchoolProfile(payload);
    return schoolProfileApi.createSchoolProfile(payload);
};

// getMySchoolProfile and linkSchoolAdminInvite are in the SchoolProfile OpenAPI
// spec, but the published @skooljobs/schoolprofile-api client may predate them.
// Until a client with both is published, they are called directly with the same
// base path, axios instance and auth headers as the generated client.

// GET /school-profiles/me — the school the caller owns as School Admin, from the token (404: none yet).
export const getMySchoolProfile = async () => {
    if (mockApiEnabled) return mockSchoolProfileService.getMySchoolProfile();
    return serviceHttp.get(`${API_BASE_PATHS.schoolProfile}/school-profiles/me`);
};

// POST /school-profiles/{schoolProfileId}/admin-invitations/{inviteId} — ADMIN only.
// 204: linked (repeating it is safe). 404 SCH_006: school not found (or not stored yet:
// creation is asynchronous). 409 SCH_007 / SCH_008 / SCH_009: see errorMessages.
export const linkSchoolAdminInvite = async (schoolProfileId, inviteId) => {
    if (mockApiEnabled) return mockSchoolProfileService.linkSchoolAdminInvite(schoolProfileId, inviteId);
    return serviceHttp.post(
        `${API_BASE_PATHS.schoolProfile}/school-profiles/${encodeURIComponent(schoolProfileId)}` +
            `/admin-invitations/${encodeURIComponent(inviteId)}`,
    );
};

// POST /school-profiles/update — schoolProfileId travels in the body.
export const updateSchoolProfile = async (payload) => {
    if (mockApiEnabled) return mockSchoolProfileService.updateSchoolProfile(payload);
    return schoolProfileApi.updateSchoolProfile(payload);
};
// GET /school-profiles (ADMIN) — SchoolProfilePage { content, page, size, totalElements, totalPages },
// newest first. Filters: status (active | pending_verification | suspended | rejected), name.
export const listSchoolProfiles = async ({ status, profileVerified, name, page = 0, size = 100 } = {}) => {
    if (mockApiEnabled) return mockSchoolProfileService.listSchoolProfiles();
    return schoolProfileApi.listSchoolProfiles(status, profileVerified, name, page, size);
};

/** Every School Profile of the tenant (ADMIN), following the pages (at most `maxPages`). */
export const listAllSchoolProfiles = async (maxPages = 10) => {
    const all = [];
    for (let page = 0; page < maxPages; page += 1) {
        const { data } = await listSchoolProfiles({ page, size: 100 });
        all.push(...(data?.content || []));
        if (!data?.totalPages || page + 1 >= data.totalPages) break;
    }
    return all;
};
