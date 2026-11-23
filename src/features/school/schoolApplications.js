import { useCallback, useEffect, useRef, useState } from "react";
import {
  listApplications,
  listInterviews,
  scheduleInterview,
  setApplicationStatus,
  updateInterview,
} from "../../services/applicationService";
import { getTeachersByIds } from "../../services/teacherprofileService";
import { PROFILE_REFRESH } from "../../lib/profileRefresh";
import { applicantSnapshot, experienceYears, normalizeTeacherProfile } from "../teacher/ownTeacherProfile";

/*
 * The school's applicants and interviews from the application service:
 *   POST /applications/search            { school_id }  → applications to the school's jobs
 *   POST /applications/interviews/search { school_id }  → their interviews
 *   POST /teachers/batch                 { teacher_ids } → the applicants' profiles (names…)
 * and the school's actions on them (status, schedule / update / cancel an interview). The
 * teacher sees the same interviews on their Interviews page (filtered by teacher_user_id).
 *
 * The shapes are the ones the school pages already use (applicant.id = application_id,
 * interview.id = interview_id). "Reviewed" and "saved" have no field in the service, so they
 * are kept in this browser.
 */

const REVIEWED_KEY = "skooljobs_reviewed_applications";
const SAVED_KEY = "skooljobs_saved_applications";
const LIST_LIMIT = 100;

const loadSet = (key) => {
  try {
    const list = JSON.parse(localStorage.getItem(key) || "[]");
    return new Set(Array.isArray(list) ? list.map(String) : []);
  } catch {
    return new Set();
  }
};
const saveSet = (key, set) => {
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    // storage unavailable
  }
};

/** Applicant snapshots the teacher's browser shared before (names when the batch has none). */
const localSnapshots = () => {
  try {
    const list = JSON.parse(localStorage.getItem("skooljobs_applicants") || "[]");
    return new Map((Array.isArray(list) ? list : []).filter((a) => a.candidateId).map((a) => [String(a.candidateId), a]));
  } catch {
    return new Map();
  }
};

/** Service status → the school pages' status. */
export function toUiStatus(status, reviewed) {
  switch (status) {
    case "shortlisted":
      return "Shortlisted";
    case "rejected_by_school":
    case "admin_rejected":
      return "Rejected";
    case "hired":
      return "Hired";
    default:
      return reviewed ? "Reviewed" : "Not Reviewed";
  }
}

/** The school pages' status → the service status (null: "Reviewed", kept in this browser). */
const API_STATUS = {
  "Not Reviewed": "submitted",
  Shortlisted: "shortlisted",
  Rejected: "rejected_by_school",
  Hired: "hired",
};

function toApplicant(app, profiles, snapshots, jobsById, reviewed, saved) {
  const teacherId = String(app.teacher_user_id || "");
  const raw = profiles.get(teacherId);
  const local = snapshots.get(teacherId);
  const snapshot = raw ? applicantSnapshot(normalizeTeacherProfile(raw)) : local?.profile || null;
  const normalized = raw ? normalizeTeacherProfile(raw) : null;
  const job = jobsById.get(String(app.job_id)) || {};
  return {
    id: app.application_id,
    applicationId: app.application_id,
    candidateId: teacherId,
    jobId: app.job_id,
    jobTitle: job.title || job.role || local?.jobTitle || "",
    name: snapshot?.name || local?.name || "Applicant",
    subject: normalized?.mainSubject || local?.subject || job.subject || "",
    experience: snapshot ? experienceYears(snapshot.experiences || []) : local?.experience || "",
    qualification: normalized?.highestQualification1 || snapshot?.highestDegree || local?.qualification || "",
    avatar: normalized?.photoUrl || local?.avatar || "",
    status: toUiStatus(app.status, reviewed.has(String(app.application_id))),
    serviceStatus: app.status,
    saved: saved.has(String(app.application_id)),
    appliedDate: app.applied_date,
    resumeId: app.resume_id,
    profile: snapshot,
  };
}

function toInterview(summary, applicantsById, jobsById) {
  const iv = summary.interview || {};
  const applicant = applicantsById.get(String(summary.application_id));
  const job = jobsById.get(String(summary.job_id)) || {};
  const reminders = iv.reminders || {};
  return {
    id: iv.interview_id,
    applicationId: summary.application_id,
    candidateId: summary.application_id, // the applicant's id on the school pages
    candidateName: applicant?.name || "Applicant",
    jobTitle: applicant?.jobTitle || job.title || job.role || "",
    subject: applicant?.subject || "",
    round: iv.round || "1st Round",
    date: iv.scheduled_date || "",
    time: (iv.scheduled_time || "").slice(0, 5),
    duration: iv.duration || "45 Minutes",
    mode: iv.mode || "Online",
    onlinePlatform: iv.online_platform || "",
    meetingLink: iv.meeting_link || "",
    location: iv.location || "",
    room: iv.room || "",
    interviewer: iv.interviewer || "",
    notesForCandidate: iv.notes_for_candidate || "",
    internalNotes: iv.internal_notes || "",
    remindConfirmation: reminders.confirmation ?? true,
    remind24h: reminders.remind_24h ?? true,
    remind1h: reminders.remind_1h ?? true,
    status: iv.status || "Scheduled",
  };
}

/** The school pages' interview form → ScheduleInterviewCommand / UpdateInterviewCommand fields. */
function toInterviewFields(form) {
  const online = form.mode === "Online";
  return {
    round: form.round,
    scheduled_date: form.date,
    scheduled_time: form.time,
    duration: form.duration,
    mode: form.mode,
    online_platform: online ? form.onlinePlatform || null : null,
    meeting_link: online ? form.meetingLink || null : null,
    location: form.mode === "In-Person" ? form.location || null : null,
    room: form.mode === "In-Person" ? form.room || null : null,
    interviewer: form.interviewer || undefined,
    notes_for_candidate: form.notesForCandidate || null,
    reminders: {
      confirmation: Boolean(form.remindConfirmation),
      remind_24h: Boolean(form.remind24h),
      remind_1h: Boolean(form.remind1h),
    },
  };
}

const messageOf = (error, fallback) => error?.response?.data?.message || error?.message || fallback;

/**
 * `schoolId` is the school profile id (applications carry the job's school). `jobs` are the
 * school's jobs (for titles). Returns { applicants, interviews, status, refresh, … actions }.
 */
export function useSchoolApplications(schoolId, jobs) {
  const [state, setState] = useState({ applications: [], interviewSummaries: [], profiles: new Map(), status: "idle" });
  const [reviewed, setReviewed] = useState(() => loadSet(REVIEWED_KEY));
  const [saved, setSaved] = useState(() => loadSet(SAVED_KEY));
  const run = useRef(0);

  const load = useCallback(async () => {
    if (!schoolId) return;
    const current = ++run.current;
    try {
      const [apps, ivs] = await Promise.all([
        listApplications({ school_id: schoolId, limit: LIST_LIMIT }).then(({ data }) => data?.data || []),
        listInterviews({ school_id: schoolId, limit: LIST_LIMIT }).then(
          ({ data }) => data?.data || [],
          (error) => {
            console.error("Failed to load interviews:", error);
            return [];
          },
        ),
      ]);
      const ids = [...new Set(apps.map((a) => a.teacher_user_id).filter(Boolean))];
      const profiles = await getTeachersByIds(ids).then(
        ({ data }) => new Map((Array.isArray(data) ? data : []).map((t) => [String(t.teacherId || t.teacher_id), t])),
        (error) => {
          console.warn("Couldn't load the applicants' profiles:", error);
          return new Map();
        },
      );
      if (current !== run.current) return;
      setState({ applications: apps, interviewSummaries: ivs, profiles, status: "ready" });
    } catch (error) {
      if (current !== run.current) return;
      console.error("Failed to load applications:", error);
      setState((prev) => ({ ...prev, status: "error" }));
    }
  }, [schoolId]);

  useEffect(() => {
    if (!schoolId) return undefined;
    const timer = setTimeout(load, 0);
    return () => {
      clearTimeout(timer);
      run.current += 1;
    };
  }, [schoolId, load]);

  /** Commands answer 202: read again once (after PROFILE_REFRESH.delayMs). */
  const reloadSoon = useCallback(() => {
    setTimeout(load, PROFILE_REFRESH.delayMs);
  }, [load]);

  const jobsById = new Map((jobs || []).map((j) => [String(j.id), j]));
  const snapshots = localSnapshots();
  const applicants = state.applications
    .filter((a) => a.status !== "withdrawn")
    .map((a) => toApplicant(a, state.profiles, snapshots, jobsById, reviewed, saved));
  const applicantsById = new Map(applicants.map((a) => [String(a.id), a]));
  const interviews = state.interviewSummaries
    .filter((s) => s.interview?.interview_id)
    .map((s) => toInterview(s, applicantsById, jobsById));

  const patchApplication = (applicationId, changes) =>
    setState((prev) => ({
      ...prev,
      applications: prev.applications.map((a) => (a.application_id === applicationId ? { ...a, ...changes } : a)),
    }));

  const patchInterview = (interviewId, changes) =>
    setState((prev) => ({
      ...prev,
      interviewSummaries: prev.interviewSummaries.map((s) =>
        s.interview?.interview_id === interviewId ? { ...s, interview: { ...s.interview, ...changes } } : s,
      ),
    }));

  /** Shortlist / reject / hire through the service; "Reviewed" only marks it in this browser. */
  const changeApplicantStatus = async (applicationId, uiStatus) => {
    const id = String(applicationId);
    const nextReviewed = new Set(reviewed);
    if (uiStatus === "Reviewed") nextReviewed.add(id);
    else nextReviewed.delete(id);
    setReviewed(nextReviewed);
    saveSet(REVIEWED_KEY, nextReviewed);

    const apiStatus = uiStatus === "Reviewed" ? "submitted" : API_STATUS[uiStatus];
    const app = state.applications.find((a) => String(a.application_id) === id);
    if (!apiStatus || !app || app.status === apiStatus) return;
    const previous = app.status;
    patchApplication(applicationId, { status: apiStatus });
    try {
      await setApplicationStatus({ application_id: applicationId, status: apiStatus });
      reloadSoon();
    } catch (error) {
      patchApplication(applicationId, { status: previous });
      throw new Error(messageOf(error, "Couldn't change the status. Please try again."), { cause: error });
    }
  };

  const toggleSaved = (applicationId) => {
    const id = String(applicationId);
    const next = new Set(saved);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSaved(next);
    saveSet(SAVED_KEY, next);
  };

  /** New interview (POST /applications/interview/schedule) or changes to one (…/update). */
  const saveInterview = async (applicationId, form, interviewId = null) => {
    const fields = toInterviewFields(form);
    try {
      if (interviewId) {
        await updateInterview({ application_id: applicationId, interview_id: interviewId, ...fields, internal_notes: form.internalNotes || null });
        patchInterview(interviewId, { ...fields, internal_notes: form.internalNotes || null });
      } else {
        await scheduleInterview({ application_id: applicationId, ...fields });
      }
      reloadSoon();
    } catch (error) {
      throw new Error(messageOf(error, "Couldn't save the interview. Please try again."), { cause: error });
    }
  };

  /** Confirmed / Completed / Cancelled (there is no delete: a removed interview is Cancelled). */
  const setInterviewStatus = async (interviewId, status) => {
    const interview = interviews.find((iv) => iv.id === interviewId);
    if (!interview) return;
    const previous = interview.status;
    patchInterview(interviewId, { status });
    try {
      await updateInterview({ application_id: interview.applicationId, interview_id: interviewId, status });
      reloadSoon();
    } catch (error) {
      patchInterview(interviewId, { status: previous });
      throw new Error(messageOf(error, "Couldn't change the interview. Please try again."), { cause: error });
    }
  };

  return {
    applicants,
    interviews,
    status: state.status,
    refresh: load,
    changeApplicantStatus,
    toggleSaved,
    saveInterview,
    setInterviewStatus,
  };
}
