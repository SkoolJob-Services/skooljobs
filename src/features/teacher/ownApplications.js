import { useCallback, useEffect, useState } from "react";
import { listApplications, listInterviews } from "../../services/applicationService";

/**
 * The signed-in teacher's applications and interviews from the application service
 * (POST /applications/search and /applications/interviews/search, filtered by
 * teacher_user_id). Applying and withdrawing answer 202 and are stored a moment later,
 * so the pages also keep what was just sent (pending) until the next reload shows it.
 */

/** ApplicationStatus (application-contracts) → the label the teacher pages show. */
export const APPLICATION_STATUS_LABELS = {
  submitted: "Under Review",
  admin_approved: "Under Review",
  admin_rejected: "Rejected",
  shortlisted: "Shortlisted",
  rejected_by_school: "Rejected",
  hired: "Hired",
  withdrawn: "Withdrawn",
};

const PAGE_LIMIT = 100;

export function useOwnApplications(teacherUserId) {
  const [state, setState] = useState({ applications: [], interviews: [], status: teacherUserId ? "loading" : "none" });
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    if (!teacherUserId) return undefined;
    let cancelled = false;
    const query = { teacher_user_id: String(teacherUserId), page: 1, limit: PAGE_LIMIT };
    Promise.all([
      listApplications(query).then(({ data }) => data?.data || []),
      listInterviews(query).then(
        ({ data }) => data?.data || [],
        // Interviews are optional for the pages: an older service without the search still lists applications.
        (error) => {
          console.error("Failed to load interviews:", error);
          return [];
        },
      ),
    ])
      .then(([applications, interviews]) => {
        if (!cancelled) setState({ applications, interviews, status: "ready" });
      })
      .catch((error) => {
        console.error("Failed to load applications:", error);
        if (!cancelled) setState((prev) => ({ ...prev, status: "error" }));
      });
    return () => {
      cancelled = true;
    };
  }, [teacherUserId, reloads]);

  /** Reload now, or after `delayMs` (the service stores a command a moment after its 202). */
  const refresh = useCallback((delayMs = 0) => {
    if (delayMs > 0) setTimeout(() => setReloads((n) => n + 1), delayMs);
    else setReloads((n) => n + 1);
  }, []);

  /** Shows a just-sent change at once (an application added, or one's status changed). */
  const patchApplications = useCallback((update) => {
    setState((prev) => ({ ...prev, applications: update(prev.applications) }));
  }, []);

  return { ...state, refresh, patchApplications };
}
