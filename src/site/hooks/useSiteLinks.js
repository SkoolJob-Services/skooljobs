import { useAuth } from "../../features/auth/AuthContext";
import { APP_LINKS } from "../siteConfig";

const SCHOOL_POST_JOB = {
  SCHOOL_ADMIN: "/school/post-job",
  SCHOOL_MEMBER: "/school/post-job",
  ADMIN: "/admin/post-job",
};

/**
 * Where the website's call-to-action buttons should go. Visitors go to sign up;
 * signed-in users go straight to the matching screen in their area.
 */
export function useSiteLinks() {
  const { isAuthenticated, role, homePath } = useAuth();
  return {
    isAuthenticated,
    isTeacher: isAuthenticated && role === "TEACHER",
    dashboard: homePath,
    findJobs: isAuthenticated && role === "TEACHER" ? "/teacher/all-jobs" : APP_LINKS.jobs,
    postVacancy: isAuthenticated ? SCHOOL_POST_JOB[role] || homePath : APP_LINKS.postVacancy,
    registerTeacher: isAuthenticated ? homePath : APP_LINKS.registerTeacher,
    resumeBuilder: isAuthenticated && role === "TEACHER" ? "/teacher/resume" : APP_LINKS.signup,
    jobDetail: (jobId) =>
      isAuthenticated && role === "TEACHER" ? `/teacher/jobs/${jobId}` : `/jobs?job=${encodeURIComponent(jobId)}`,
  };
}
