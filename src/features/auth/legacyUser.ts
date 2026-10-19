import { decodeJwtClaims, nameFromToken, subjectFromToken, type AppRole } from "./roles";
import type { AuthSession } from "./types";

/**
 * Bridge to the existing SkoolJobs pages, which read the logged-in user from
 * localStorage "currentUser" ({ id, name, email, phone, role, ... }).
 * AuthProvider writes it from the signup-service session and removes it on
 * logout, so the dashboards keep working unchanged. New code should use
 * useAuth() instead; delete this bridge once no page reads "currentUser".
 */
export const CURRENT_USER_KEY = "currentUser";

/** Role names the existing pages check (user.role). */
const LEGACY_ROLE: Record<AppRole, string> = {
  ADMIN: "admin",
  HEAD_ADMIN: "headAdmin",
  SCHOOL_ADMIN: "employer",
  SCHOOL_MEMBER: "employer",
  TEACHER: "candidate",
};

export interface LegacyUser {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role: string;
  isMember?: boolean;
  roleCodes: string[];
  tenantId?: string;
}

export function toLegacyUser(session: AuthSession, role: AppRole, roleCodes: string[]): LegacyUser {
  const claims = decodeJwtClaims(session.accessToken) ?? {};
  const text = (key: string) => (typeof claims[key] === "string" && claims[key] ? (claims[key] as string) : undefined);
  const isEmail = session.identifier.includes("@");
  const name = nameFromToken(session.accessToken);
  return {
    id: subjectFromToken(session.accessToken) ?? session.identifier,
    name,
    firstName: text("given_name") ?? text("firstName") ?? name?.split(" ")[0],
    lastName: text("family_name") ?? text("lastName"),
    email: text("email") ?? (isEmail ? session.identifier : undefined),
    phone: text("phone") ?? text("phone_number") ?? (isEmail ? undefined : session.identifier),
    role: LEGACY_ROLE[role],
    isMember: role === "SCHOOL_MEMBER" || undefined,
    roleCodes,
    tenantId: session.tenantId,
  };
}

export function writeLegacyUser(user: LegacyUser): void {
  try {
    // Keep fields the pages added themselves (profile photo, school name...) for the same user.
    const previous = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || "null") as Record<string, unknown> | null;
    const merged = previous && previous.id === user.id ? { ...previous, ...stripUndefined(user) } : user;
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(merged));
  } catch {
    // storage unavailable
  }
}

export function clearLegacyUser(): void {
  try {
    localStorage.removeItem(CURRENT_USER_KEY);
  } catch {
    // ignore
  }
}

function stripUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;
}
