import { useEffect, useState } from "react";
import { listJobs } from "../../services/jobService";
import { getSchoolProfile } from "../../services/schoolProfileService";
import { config } from "../../config/env";
import { SAMPLE_JOBS } from "../data/sampleJobs";

// Only jobs that are live and approved are shown on the public website.
const isPublished = (job) =>
  (!job.status || job.status === "OPEN") &&
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
});

/** Live jobs from GET /jobs (the same Job Posting service the dashboards use). */
export function usePublicJobs() {
  // `npm run dev:mock` has no Job Posting service: show the demo jobs instead.
  const [state, setState] = useState(() =>
    config.useMockApi
      ? { jobs: SAMPLE_JOBS, loading: false, error: null }
      : { jobs: [], loading: true, error: null },
  );

  useEffect(() => {
    let cancelled = false;
    if (config.useMockApi) return undefined;
    listJobs()
      .then(({ data }) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : data?.content || data?.items || [];
        const jobs = list
          .filter(isPublished)
          .map(mapPublicJob)
          .sort((a, b) => String(b.postedDate || "").localeCompare(String(a.postedDate || "")));
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
  }, []);

  return state;
}

// School names by schoolProfileId, shared by every page in this tab.
const schoolNames = new Map();

/**
 * JobResponse has only schoolProfileId: look up each school's name once
 * (GET /school-profiles/{id}). Best effort - a failed lookup leaves the name empty.
 */
async function withSchoolNames(jobs) {
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
