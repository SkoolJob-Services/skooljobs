import type { LoginResponse } from "../../api";
import { CURRENT_USER_KEY } from "./legacyUser";
import type { AppRole } from "./roles";

/**
 * Temporary local logins for accounts the backend can't log in yet (Head Admin's
 * HEAD_ADMIN role isn't in the backend mapping; the platform admin and the demo
 * school HR (hr@school.in) have no
 * backend account). Logging in with one of these emails skips the OTP call and
 * builds the session in the browser; their pages already work from
 * localStorage. Remove once the backend issues these tokens.
 */
interface LocalAccount {
  role: AppRole;
  profile: Record<string, unknown> & { name: string };
}

const LOCAL_ACCOUNTS: Record<string, LocalAccount> = {
  "headadmin@skooljobs.com": {
    role: "HEAD_ADMIN",
    profile: {
      name: "EduHire Group Admin",
      companyName: "EduHire Recruiters Group",
      city: "Delhi",
      phone: "9876005678",
      profilePhoto: "https://i.pravatar.cc/300?img=54",
      managedSchools: [
        "School 1 — Bhopal Central",
        "School 2 — Bhopal East",
        "School 3 — Indore",
        "School 4 — Indore South",
        "School 5 — Ujjain",
      ],
    },
  },
  "hr@school.in": {
    role: "SCHOOL_ADMIN",
    profile: {
      name: "Green Valley School",
      companyName: "Green Valley School",
      city: "Bhopal",
      phone: "9999999999",
      totalTeachers: 45,
      profilePhoto: "https://i.pravatar.cc/300?img=20",
    },
  },
  "admin@skooljobs.com": {
    role: "ADMIN",
    profile: {
      name: "SkoolJobs Admin",
      profilePhoto: "https://i.pravatar.cc/300?img=68",
    },
  },
};

/** The local account for this identifier, if any. */
export function findLocalAccount(identifier: string): (LocalAccount & { email: string }) | null {
  // Dev server only: production builds never log in without the server's OTP.
  if (!import.meta.env.DEV) return null;
  const email = identifier.trim().toLowerCase();
  const account = LOCAL_ACCOUNTS[email];
  return account ? { ...account, email } : null;
}

function base64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** True for a session built by localLogin(): the backend won't accept its token. */
export function isLocalSession(session: { sessionId?: string } | null | undefined): boolean {
  return session?.sessionId === "local";
}

/** Unsigned JWT-shaped token so roleFromToken() resolves the account's role. */
export function localLogin(account: LocalAccount & { email: string }): LoginResponse {
  const header = base64Url(JSON.stringify({ alg: "none", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({
      sub: `local-${account.email}`,
      roles: [account.role],
      email: account.email,
      name: account.profile.name,
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
    }),
  );
  return {
    success: true,
    message: "Login successful.",
    accessToken: `${header}.${payload}.`,
    refreshToken: "local",
    sessionId: "local",
    tenantId: "local",
    appId: "local",
  } as LoginResponse;
}

/** Add the account's profile (managed schools, photo...) to localStorage "currentUser" after signIn(). */
export function writeLocalProfile(account: LocalAccount): void {
  try {
    const current = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || "{}");
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify({ ...account.profile, ...current, ...account.profile }));
  } catch {
    // storage unavailable
  }
}
