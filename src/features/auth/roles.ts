/**
 * App roles and how they are worked out from the access token.
 *
 * The role codes come from the SkoolJobs RolePermissionMapping in
 * system-configuration (ADMIN, SCHOOL_ADMIN, SCHOOL_MEMBER, TEACHER).
 * Which claim the signup service uses (roles / role / authorities /
 * realm_access.roles / scope) is read defensively below.
 * HEAD_ADMIN (one login for several schools) is not in the backend mapping yet;
 * the UI already knows it so the head-admin area works once the role exists.
 */

export type AppRole = "ADMIN" | "HEAD_ADMIN" | "SCHOOL_ADMIN" | "SCHOOL_MEMBER" | "TEACHER";

/** Checked in this order: the first role the token grants wins. */
export const APP_ROLES: AppRole[] = ["ADMIN", "HEAD_ADMIN", "SCHOOL_ADMIN", "SCHOOL_MEMBER", "TEACHER"];

/** Backend role codes that map to each app role (compared upper-case). */
export const ROLE_CODES: Record<AppRole, string[]> = {
  ADMIN: ["ADMIN", "PLATFORM_ADMIN", "SUPER_ADMIN"],
  HEAD_ADMIN: ["HEAD_ADMIN", "GROUP_ADMIN"],
  SCHOOL_ADMIN: ["SCHOOL_ADMIN", "EMPLOYER"],
  SCHOOL_MEMBER: ["SCHOOL_MEMBER"],
  TEACHER: ["TEACHER", "CANDIDATE"],
};

/** Role code sent to POST /invites for each invitable role (SkoolJobs inviteRules). */
export const INVITE_ROLE_CODE: Partial<Record<AppRole, string>> = {
  SCHOOL_ADMIN: "SCHOOL_ADMIN",
  SCHOOL_MEMBER: "SCHOOL_MEMBER",
};

export const ROLE_LABEL: Record<AppRole, string> = {
  ADMIN: "SkoolJobs admin",
  HEAD_ADMIN: "Head admin",
  SCHOOL_ADMIN: "School admin",
  SCHOOL_MEMBER: "School member",
  TEACHER: "Teacher",
};

/** Who can invite whom (system-configuration inviteRules): admin → school admin/member; school admin → member. */
export function invitableRoles(role: AppRole): AppRole[] {
  if (role === "ADMIN") return ["SCHOOL_ADMIN", "SCHOOL_MEMBER"];
  if (role === "SCHOOL_ADMIN") return ["SCHOOL_MEMBER"];
  return [];
}

/** Home page of each role's area. */
export const ROLE_HOME: Record<AppRole, string> = {
  ADMIN: "/admin/dashboard",
  HEAD_ADMIN: "/head-admin/dashboard",
  SCHOOL_ADMIN: "/school/dashboard",
  SCHOOL_MEMBER: "/school/dashboard",
  TEACHER: "/teacher/dashboard",
};

/** Decode a JWT payload without verifying it (the server verifies; the UI only reads claims). */
export function decodeJwtClaims(token: string | null | undefined): Record<string, unknown> | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function toStrings(value: unknown): string[] {
  if (typeof value === "string") return value.split(/[\s,]+/).filter(Boolean);
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (typeof item === "string") return [item];
      // Spring-style authorities: [{ authority: "ROLE_ADMIN" }]
      if (item && typeof item === "object" && typeof (item as { authority?: unknown }).authority === "string") {
        return [(item as { authority: string }).authority];
      }
      return [];
    });
  }
  return [];
}

/** All role codes found in the token claims, upper-cased, "ROLE_" prefix removed. */
export function extractRoleCodes(claims: Record<string, unknown> | null): string[] {
  if (!claims) return [];
  const realm = claims.realm_access as { roles?: unknown } | undefined;
  const raw = [
    ...toStrings(claims.roles),
    ...toStrings(claims.role),
    ...toStrings(claims.authorities),
    ...toStrings(claims.groups),
    ...toStrings(realm?.roles),
    ...toStrings(claims.scope),
  ];
  const codes = raw.map((code) => code.toUpperCase().replace(/^ROLE_/, ""));
  return Array.from(new Set(codes));
}

/** Highest app role the codes grant. Falls back to TEACHER (the self-signup type). */
export function resolveAppRole(codes: string[]): AppRole {
  const upper = codes.map((code) => code.toUpperCase());
  for (const role of APP_ROLES) {
    if (upper.some((code) => ROLE_CODES[role].includes(code))) return role;
  }
  return "TEACHER";
}

export function roleFromToken(token: string | null | undefined): { role: AppRole; roleCodes: string[] } {
  const roleCodes = extractRoleCodes(decodeJwtClaims(token));
  return { role: resolveAppRole(roleCodes), roleCodes };
}

/** The token's subject (user id), if present. */
export function subjectFromToken(token: string | null | undefined): string | undefined {
  const sub = decodeJwtClaims(token)?.sub;
  return typeof sub === "string" && sub ? sub : undefined;
}

/** Display name from the token, if the backend includes one. */
export function nameFromToken(token: string | null | undefined): string | undefined {
  const claims = decodeJwtClaims(token);
  if (!claims) return undefined;
  const name = claims.name ?? claims.given_name ?? claims.firstName;
  return typeof name === "string" && name.trim() ? name.trim() : undefined;
}
