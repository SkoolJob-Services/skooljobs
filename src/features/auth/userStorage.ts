/**
 * Keeps each user's browser data apart.
 *
 * The existing pages store a user's own data in fixed localStorage keys (profile cache, saved and
 * applied jobs, resumes, the school's jobs and team...). On a shared browser the next user would
 * see it. When a different user signs in, the previous user's keys are put aside under their user
 * id and the new user's own set (if they used this browser before) is put back, so each user keeps
 * their data and never sees anyone else's.
 *
 * Keys that act as the shared hand-off between a school and a teacher until the Application API
 * carries this data (skooljobs_applicants, skooljobs_interviews) and the mock services' stores are
 * not personal and stay where they are.
 */

/** localStorage keys that belong to the signed-in user. */
export const PERSONAL_KEYS = [
  // teacher
  "skooljobs_teacher_data",
  "skooljobs_teacher_qualifications",
  "skooljobs_teacher_experiences",
  "skooljobs_teacher_languages",
  "skooljobs_teacher_achievements",
  "skooljobs_teacher_awards",
  "skooljobs_teacher_courses",
  "skooljobs_teacher_activities",
  "skooljobs_resumes",
  "skooljobs_cover_letters",
  "skooljobs_saved_jobs",
  "skooljobs_applied_jobs",
  // school
  "skooljobs_jobs",
  "skooljobs_members",
  "schoolProfileId",
  // misc
  "userName",
] as const;

/** Whose personal keys are currently in place. */
export const OWNER_KEY = "skooljobs_storage_owner";
const ARCHIVE_PREFIX = "skooljobs_user_data:";

/**
 * Makes `userId` the owner of the personal keys: called on every sign-in before "currentUser" is
 * written. Same user → nothing changes. Different user → the previous owner's keys are archived and
 * cleared, then this user's archive (if any) is restored.
 */
export function switchStorageOwner(userId: string, storage: Storage = localStorage): void {
  if (!userId) return;
  try {
    const owner = storage.getItem(OWNER_KEY) ?? ownerFromCurrentUser(storage);
    if (owner === userId) {
      storage.setItem(OWNER_KEY, userId);
      return;
    }

    if (owner) {
      const archive: Record<string, string> = {};
      for (const key of PERSONAL_KEYS) {
        const value = storage.getItem(key);
        if (value !== null) archive[key] = value;
      }
      if (Object.keys(archive).length > 0) {
        storage.setItem(ARCHIVE_PREFIX + owner, JSON.stringify(archive));
      }
    }
    // Data with no known owner (older versions, before this existed) is dropped rather than
    // handed to whoever signs in next.
    for (const key of PERSONAL_KEYS) storage.removeItem(key);

    const saved = storage.getItem(ARCHIVE_PREFIX + userId);
    if (saved) {
      const restored = JSON.parse(saved) as Record<string, string>;
      for (const key of PERSONAL_KEYS) {
        if (typeof restored[key] === "string") storage.setItem(key, restored[key]);
      }
      storage.removeItem(ARCHIVE_PREFIX + userId);
    }
    storage.setItem(OWNER_KEY, userId);
  } catch {
    // storage unavailable or an unreadable archive: the pages fall back to empty data
  }
}

/** The previous session's user, for browsers that used the app before the owner key existed. */
function ownerFromCurrentUser(storage: Storage): string | null {
  try {
    const user = JSON.parse(storage.getItem("currentUser") || "null") as { id?: unknown } | null;
    return user && user.id != null ? String(user.id) : null;
  } catch {
    return null;
  }
}
