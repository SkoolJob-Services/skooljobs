import { useCallback, useEffect, useRef, useState } from "react";
import { getOwnTeacherProfile } from "../../services/teacherprofileService";
import { config } from "../../config/env";

// GET /teachers/me returns the Teacher contract. Its field names are mixed (some snake_case
// via @JsonProperty, some plain camelCase), so every field is read in both spellings.
const pick = (obj, ...keys) => {
  if (!obj) return undefined;
  for (const key of keys) {
    const value = obj[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
};
const list = (obj, ...keys) => {
  const value = pick(obj, ...keys);
  return Array.isArray(value) ? value : [];
};

/** The /teachers/me response in the shape the dashboard uses. */
export function normalizeTeacherProfile(data) {
  if (!data) return null;
  const contact = pick(data, "contact") || {};
  const address = pick(data, "address") || {};
  const firstName = pick(data, "first_name", "firstName") || "";
  const lastName = pick(data, "last_name", "lastName") || "";
  return {
    teacherId: pick(data, "teacher_id", "teacherId"),
    title: pick(data, "title"),
    age: pick(data, "age"),
    firstName,
    lastName,
    fullName: [firstName, lastName].filter(Boolean).join(" "),
    email: pick(contact, "primary_email", "primaryEmail"),
    mobile: pick(contact, "mobile"),
    whatsapp: pick(contact, "whatsapp"),
    city: pick(address, "city"),
    mainSubject: pick(data, "main_subject", "mainSubject"),
    currentJobTitle: pick(data, "current_job_title", "currentJobTitle"),
    highestQualification1: pick(data, "highest_qualification_1", "highestQualification1"),
    highestQualification2: pick(data, "highest_qualification_2", "highestQualification2"),
    photoUrl: pick(data, "profile_photo_url", "profilePhotoUrl"),
    summary: pick(data, "summary"),
    dob: pick(data, "dob"),
    languages: list(data, "languages"),
    qualifications: list(data, "qualifications"),
    experiences: list(data, "experiences"),
    achievements: list(data, "achievements"),
    resumes: list(data, "resumes"),
    savedJobs: list(data, "saved_jobs", "savedJobs"),
    profileScore: pick(data, "profile_score", "profileScore"),
  };
}

const year = (date) => (date ? String(date).slice(0, 4) : "");

/**
 * Copy of the teacher's real profile stored on an application, so the school sees the applicant's
 * actual details (there is no API yet that lets a school read a teacher's profile by id).
 * Only what the teacher has filled in: nothing is made up.
 */
export function applicantSnapshot(profile, { displayName = "", currentUser = {} } = {}) {
  const p = profile || normalizeTeacherProfile({});
  const qualifications = p.qualifications.map((q) => ({
    degree: pick(q, "degree", "course") || "",
    school: pick(q, "college", "school_name", "schoolName", "university") || "",
    university: pick(q, "university") || "",
    year: pick(q, "year_passed", "yearPassed") || "",
    score: pick(q, "percentage") || "",
  }));
  const experiences = p.experiences.map((e) => {
    const start = pick(e, "start_date", "startDate");
    const end = pick(e, "end_date", "endDate");
    const current = !!pick(e, "is_current_employer", "isCurrentEmployer");
    return {
      jobTitle: pick(e, "post_held", "postHeld") || "",
      schoolName: pick(e, "school_name", "schoolName") || "",
      startYear: year(start),
      endYear: current ? "Present" : year(end),
      details: pick(e, "details") || "",
      startDate: start || "",
      endDate: end || "",
      currentEmployer: current,
    };
  });
  const achievements = p.achievements.map((a) => ({
    name: pick(a, "name", "type") || "",
    year: pick(a, "year") || "",
    by: pick(a, "issued_by", "issuedBy") || "",
  }));
  return {
    name: p.fullName || displayName,
    title: p.title || "",
    firstName: p.firstName || "",
    lastName: p.lastName || "",
    email: p.email || currentUser.email || "",
    phone: p.mobile || currentUser.phone || "",
    city: p.city || "",
    age: p.age != null ? String(p.age) : "",
    mainSubject: p.mainSubject || "",
    currentJob: p.currentJobTitle || "",
    highestDegree: p.highestQualification1 || qualifications[0]?.degree || "",
    university: qualifications[0]?.university || "",
    summary: p.summary || "",
    qualifications,
    experiences,
    achievements,
  };
}

/** Total years of experience from a snapshot's experiences (one decimal), or "". */
export function experienceYears(experiences = []) {
  const years = experiences.reduce((sum, e) => {
    if (!e.startDate) return sum;
    const end = e.currentEmployer || !e.endDate ? new Date() : new Date(e.endDate);
    return sum + Math.max(0, (end - new Date(e.startDate)) / (365 * 24 * 60 * 60 * 1000));
  }, 0);
  return years > 0 ? `${years.toFixed(1)} years` : "";
}

// What makes a complete teacher profile: each item is one equal share of 100%.
const COMPLETION_CHECKS = [
  (p) => p.firstName && p.lastName,
  (p) => p.email,
  (p) => p.mobile,
  (p) => p.photoUrl,
  (p) => p.dob,
  (p) => p.city,
  (p) => p.mainSubject,
  (p) => p.highestQualification1,
  (p) => p.summary,
  (p) => p.languages.length > 0,
  (p) => p.qualifications.length > 0,
  (p) => p.experiences.length > 0,
];

/** Profile strength 0–100: the backend's profile_score when it sends one, else computed. */
export function profileCompletion(profile) {
  if (!profile) return 0;
  const score = Number(profile.profileScore);
  if (Number.isFinite(score) && score > 0) return Math.min(100, Math.round(score));
  const done = COMPLETION_CHECKS.filter((check) => check(profile)).length;
  return Math.round((done / COMPLETION_CHECKS.length) * 100);
}

/** Input for computeJobMatch (lib/jobMatch.js) built from the backend profile. */
export function toMatchProfile(profile) {
  if (!profile) return null;
  return {
    teacherData: {
      mainSubject: profile.mainSubject,
      highestQualificationOne: profile.highestQualification1,
      highestQualificationTwo: profile.highestQualification2,
    },
    qualifications: profile.qualifications.map((q) => ({ degree: pick(q, "degree") })),
    experiences: profile.experiences.map((e) => ({
      startDate: pick(e, "start_date", "startDate"),
      endDate: pick(e, "end_date", "endDate"),
      currentEmployer: pick(e, "is_current_employer", "isCurrentEmployer"),
    })),
  };
}

/** `npm run dev:mock` has no teacher-profile service: a profile from the signed-in user. */
function mockProfile() {
  let user = {};
  try {
    user = JSON.parse(localStorage.getItem("currentUser") || "{}");
  } catch {
    /* ignore */
  }
  return normalizeTeacherProfile({
    teacher_id: user.id,
    first_name: user.firstName || user.name?.split(" ")[0],
    last_name: user.lastName,
    contact: { primary_email: user.email, mobile: user.phone },
    profile_photo_url: user.profilePhoto,
  });
}

// Right after signup the profile is still being created from the signup event (Kafka), so a
// 404 is retried a few times before giving up.
const RETRY_DELAYS_MS = [1000, 2000, 3000, 4000];

/**
 * The signed-in teacher's own profile from GET /teachers/me.
 * Returns { profile, raw, status: "loading" | "ready" | "missing" | "error", error, refresh }.
 */
export function useOwnTeacherProfile() {
  const [state, setState] = useState(() =>
    config.useMockApi
      ? { profile: mockProfile(), raw: null, status: "ready", error: null }
      : { profile: null, raw: null, status: "loading", error: null },
  );
  const run = useRef(0);

  const load = useCallback(async () => {
    if (config.useMockApi) return;
    const current = ++run.current;
    for (let attempt = 0; ; attempt += 1) {
      try {
        const { data } = await getOwnTeacherProfile();
        if (current !== run.current) return;
        setState({ profile: normalizeTeacherProfile(data), raw: data, status: "ready", error: null });
        return;
      } catch (error) {
        if (current !== run.current) return;
        const notFound = error?.response?.status === 404;
        if (notFound && attempt < RETRY_DELAYS_MS.length) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
          if (current !== run.current) return;
          continue;
        }
        if (!notFound) console.error("Failed to load teacher profile:", error);
        setState({ profile: null, raw: null, status: notFound ? "missing" : "error", error });
        return;
      }
    }
  }, []);

  useEffect(() => {
    // The fetch runs outside the effect body; state is only set from its callbacks.
    const timer = setTimeout(load, 0);
    return () => {
      clearTimeout(timer);
      run.current += 1;
    };
  }, [load]);

  const refresh = useCallback(() => {
    setState((prev) => ({ ...prev, status: prev.profile ? prev.status : "loading" }));
    load();
  }, [load]);

  return { ...state, refresh };
}
