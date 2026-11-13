import { beforeEach, describe, expect, it, vi } from "vitest";

// The real axios instance is replaced; everything else (base paths, the module itself) is real.
const serviceHttp = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("../api/httpClient", () => ({ serviceHttp }));
vi.mock("../api", () => ({ mockApiEnabled: false }));

const { getMySchoolProfile, linkSchoolAdminInvite } = await import("./schoolProfileService");

const SCHOOL = "d72b9f41-73f7-4d77-8a14-2ef8d9f1b912";
const INVITE = "8d29cb84-7d17-4fb7-b98f-a94cebbd8eb2";

describe("schoolProfileService: SchoolProfile API contract", () => {
  beforeEach(() => {
    serviceHttp.get.mockReset().mockResolvedValue({ status: 200, data: { schoolProfileId: SCHOOL } });
    serviceHttp.post.mockReset().mockResolvedValue({ status: 204, data: "" });
  });

  it("reads the caller's own school from GET /school-profiles/me", async () => {
    const response = await getMySchoolProfile();

    expect(serviceHttp.get).toHaveBeenCalledTimes(1);
    expect(serviceHttp.get).toHaveBeenCalledWith("/api/school-profile/school-profiles/me");
    expect(response.data.schoolProfileId).toBe(SCHOOL);
  });

  it("links an invite with POST /school-profiles/{schoolProfileId}/admin-invitations/{inviteId} and no body", async () => {
    await linkSchoolAdminInvite(SCHOOL, INVITE);

    expect(serviceHttp.post).toHaveBeenCalledTimes(1);
    expect(serviceHttp.post.mock.calls[0]).toEqual([
      `/api/school-profile/school-profiles/${SCHOOL}/admin-invitations/${INVITE}`,
    ]);
  });

  it("encodes the ids, so a value can't change the path", async () => {
    await linkSchoolAdminInvite("a/../b", "c?d");

    expect(serviceHttp.post).toHaveBeenCalledWith(
      "/api/school-profile/school-profiles/a%2F..%2Fb/admin-invitations/c%3Fd",
    );
  });

  it("passes failures through unchanged for the caller to classify", async () => {
    const conflict = { isAxiosError: true, response: { status: 409, data: { code: "SCH_008" } } };
    serviceHttp.post.mockRejectedValue(conflict);

    await expect(linkSchoolAdminInvite(SCHOOL, INVITE)).rejects.toBe(conflict);
  });
});
