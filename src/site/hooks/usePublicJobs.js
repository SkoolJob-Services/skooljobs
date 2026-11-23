import { useEffect, useState } from "react";
import { useTenant } from "../../features/tenant/TenantContext";
import { listJobs } from "../../services/jobService";
import { getSchoolProfile } from "../../services/schoolProfileService";
import { config } from "../../config/env";
import { SAMPLE_JOBS } from "../data/sampleJobs";
import { sessionStore } from "../../features/auth/sessionStore";

// Only jobs that are live and approved are shown on the public website.
// Job statuses (job-contracts): ACTIVE, or SCHEDULED once its publishAt has passed.
const isPublished = (job) =>
  (!job.status ||
    job.status === "ACTIVE" ||
    (job.status === "SCHEDULED" && job.publishAt && new Date(job.publishAt) <= new Date())) &&
  (!job.adminReviewStatus || job.adminReviewStatus === "APPROVED");

/** JobResponse (job service) -> the fields the website job cards show. */
export const mapPublicJob = (job) => ({
  id: job.jobId,
  title: job.title || job.subject || "Teaching Role",
  subject: job.subject || "",
  roleCategory: job.roleCategory || "",
  schoolProfileId: job.schoolProfileId || null,
  school: job.schoolName || job.schoolProfileName || "",
  location: job.location || "",
  employmentType: job.employmentType || "",
  experience: job.experienceRequired || "",
  salary: job.compensation || "",
  description: job.description || "",
  qualifications: Array.isArray(job.qualificationsRequired)
    ? job.qualificationsRequired
    : job.qualificationsRequired
      ? [job.qualificationsRequired]
      : [],
  applicants: job.applicantsCount || 0,
  postedDate: job.postedDate || null,
  // The job's own picture, when the job service sends one; none = the card has no picture.
  image: job.imageUrl || job.coverImageUrl || job.image || null,
});

/**
 * Live jobs from GET /jobs (the same Job Posting service the dashboards use). Works without a
 * login: the job service answers visitors with live, approved jobs of the tenant in X-Tenant-Id.
 */
export function usePublicJobs() {
  // Visitors (no login) are answered for this deployment's tenant (X-Tenant-Id, from
  // GET /tenants/current): wait until it is known. A logged-in user's token says the tenant.
  const { tenant, status: tenantStatus } = useTenant();
  const tenantId = tenant?.tenantId || null;
  const loggedIn = Boolean(sessionStore.load()?.accessToken);
  const canLoad = config.useMockApi || loggedIn || Boolean(tenantId);

  // `npm run dev:mock` has no Job Posting service: show the demo jobs instead.
  const [state, setState] = useState(() =>
    config.useMockApi
      ? { jobs: SAMPLE_JOBS, loading: false, error: null }
      : { jobs: [], loading: true, error: null },
  );

  useEffect(() => {
    if (!canLoad) return undefined;
    let cancelled = false;
    listJobs()
      .then(({ data }) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : data?.content || data?.items || [];
        const jobs = list
          .filter(isPublished)
          .map(mapPublicJob)
          .sort((a, b) => String(b.postedDate || "").localeCompare(String(a.postedDate || "")));
        // Mock: jobs approved in the in-browser job service, then the demo jobs.
        if (config.useMockApi) jobs.push(...SAMPLE_JOBS);
        setState({ jobs, loading: false, error: null });
        return withSchoolNames(jobs);
      })
      .then((named) => {
        if (!cancelled && named) setState({ jobs: named, loading: false, error: null });
      })
      .catch((error) => {
        if (!cancelled) setState({ jobs: [], loading: false, error });
      });
    return () => {
      cancelled = true;
    };
  }, [canLoad, tenantId]);

  // The tenant couldn't be loaded: there is nothing to ask the job service for.
  if (!canLoad && tenantStatus === "error") {
    return { jobs: [], loading: false, error: new Error("The organisation couldn't be loaded.") };
  }
  return state;
}

// School names by schoolProfileId, shared by every page in this tab.
const schoolNames = new Map();

/**
 * JobResponse has only schoolProfileId: look up each school's name once
 * (GET /school-profiles/{id}). Best effort - a failed lookup leaves the name empty.
 */
async function withSchoolNames(jobs) {
  // GET /school-profiles/{id} needs a login; the job service already sends schoolName, so a
  // visitor's list keeps what it has.
  if (!sessionStore.load()?.accessToken) return null;
  const ids = [...new Set(jobs.map((j) => j.schoolProfileId).filter((id) => id && !schoolNames.has(id)))];
  if (ids.length === 0 && jobs.every((j) => j.school || !j.schoolProfileId)) return null;
  await Promise.all(
    ids.map((id) =>
      getSchoolProfile(id)
        .then(({ data }) => schoolNames.set(id, data?.schoolName || ""))
        .catch(() => schoolNames.set(id, "")),
    ),
  );
  return jobs.map((j) => (j.school ? j : { ...j, school: schoolNames.get(j.schoolProfileId) || "" }));
}

/** "Posted 3 days ago" style label. */
export function postedLabel(date) {
  if (!date) return "";
  const posted = new Date(date);
  if (Number.isNaN(posted.getTime())) return "";
  const days = Math.floor((Date.now() - posted.getTime()) / 86400000);
  if (days <= 0) return "Posted today";
  if (days === 1) return "Posted yesterday";
  if (days < 30) return `Posted ${days} days ago`;
  return `Posted ${posted.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
}

/** Filters used by the hero search and the jobs page. */
export function filterJobs(jobs, { q = "", subject = "", location = "", experience = "" }) {
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const loc = location.trim().toLowerCase();
  return jobs.filter((job) => {
    const haystack = [job.title, job.subject, job.school, job.location, job.description, job.roleCategory]
      .join(" ")
      .toLowerCase();
    if (words.some((w) => !haystack.includes(w))) return false;
    if (subject && job.subject.toLowerCase() !== subject.toLowerCase()) return false;
    if (loc && !job.location.toLowerCase().includes(loc)) return false;
    if (experience && experience !== "Any Experience" && job.experience && job.experience !== experience) return false;
    return true;
  });
}
