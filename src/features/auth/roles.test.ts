import { describe, expect, it } from "vitest";
import { extractRoleCodes, invitableRoles, resolveAppRole, roleFromToken, ROLE_HOME } from "./roles";

function token(payload: object): string {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${encode({ alg: "none" })}.${encode(payload)}.`;
}

describe("roles", () => {
  it("reads roles from the common claim shapes", () => {
    expect(extractRoleCodes({ roles: ["ROLE_TEACHER"] })).toEqual(["TEACHER"]);
    expect(extractRoleCodes({ role: "school_admin" })).toEqual(["SCHOOL_ADMIN"]);
    expect(extractRoleCodes({ authorities: [{ authority: "ROLE_SCHOOL_MEMBER" }] })).toEqual(["SCHOOL_MEMBER"]);
    expect(extractRoleCodes({ realm_access: { roles: ["ADMIN"] } })).toEqual(["ADMIN"]);
  });

  it("picks the highest role and falls back to teacher", () => {
    expect(resolveAppRole(["TEACHER", "SCHOOL_MEMBER"])).toBe("SCHOOL_MEMBER");
    expect(resolveAppRole(["SCHOOL_MEMBER", "SCHOOL_ADMIN"])).toBe("SCHOOL_ADMIN");
    expect(resolveAppRole(["SCHOOL_ADMIN", "ADMIN"])).toBe("ADMIN");
    expect(resolveAppRole(["HEAD_ADMIN"])).toBe("HEAD_ADMIN");
    expect(resolveAppRole([])).toBe("TEACHER");
  });

  it("decodes the access token", () => {
    expect(roleFromToken(token({ sub: "u1", roles: ["SCHOOL_ADMIN"] })).role).toBe("SCHOOL_ADMIN");
    expect(roleFromToken("not-a-jwt").role).toBe("TEACHER");
    expect(roleFromToken(null).role).toBe("TEACHER");
  });

  it("sends every role to its own area", () => {
    expect(ROLE_HOME.TEACHER).toBe("/teacher/dashboard");
    expect(ROLE_HOME.SCHOOL_MEMBER).toBe("/school/dashboard");
    expect(ROLE_HOME.ADMIN).toBe("/admin/dashboard");
  });

  it("limits who can invite whom", () => {
    expect(invitableRoles("ADMIN")).toEqual(["SCHOOL_ADMIN", "SCHOOL_MEMBER"]);
    expect(invitableRoles("SCHOOL_ADMIN")).toEqual(["SCHOOL_MEMBER"]);
    expect(invitableRoles("TEACHER")).toEqual([]);
  });
});
