import { useEffect, useMemo, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import {
  BriefcaseBusiness,
  ChevronDown,
  Clock3,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Sparkles,
  UserRound,
  Calendar,
  ClipboardList,
  Settings,
  Bookmark,
  X,
} from "lucide-react";
import { resumesData } from "../lib/teacherdata";
import { computeJobMatch, loadTeacherMatchProfile } from "../lib/jobMatch";
import { applyToJob, withdrawApplication } from "../services/applicationService";
import { mockApiEnabled } from "../api";
import { getJobById } from "../services/jobService";
import { APPLICATION_STATUS_LABELS, useOwnApplications } from "../features/teacher/ownApplications";
import {
  applicantSnapshot,
  experienceYears,
  profileCompletion,
  toMatchProfile,
  fetchOwnTeacherProfile,
  useOwnTeacherProfile,
} from "../features/teacher/ownTeacherProfile";
import { mapPublicJob, usePublicJobs } from "../site/hooks/usePublicJobs";
import { updateTeacherProfile } from "../services/teacherprofileService";
import styles from "./TeacherLayout.module.css";
import { DocumentImage } from "../components/DocumentImage";
import { BrandLogo } from "../components/BrandLogo";
import { refreshAfterSave, saveStartedAt, setNotificationStatus, signalProfileUpdated } from "../lib/profileRefresh";
import {
  connect as connectNotificationSocket,
  disconnect as disconnectNotificationSocket,
  isConnected as notificationSocketOpen,
} from "../services/websocketservice";
import NotificationToasts from "../components/NotificationToasts";
import { ApplyDialog } from "../features/teacher/ApplyDialog";
import { DOCUMENT_TYPES, uploadDocumentRef } from "../services/documentService";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** mapPublicJob() result → the job card shape the teacher pages use. */
const toTeacherJob = (j) => ({
  id: j.id,
  role: j.title || "Teaching Position",
  school: j.school || "",
  location: j.location || "",
  type: j.employmentType || "",
  salary: j.salary || "",
  skill: j.subject || "",
  description: j.description,
  qualifications: (j.qualifications || []).join(", "),
  roleType: j.roleCategory,
  postedDate: j.postedDate,
});

/** Teacher contract Resume (GET /teachers/me resumes[]) → the resume shape the pages use. */
const fromBackendResume = (r) => ({
  id: r.resume_id || r.resumeId,
  name: r.file_name || r.fileName || r.title || "Resume",
  title: r.title || "",
  skill: r.skill || "",
  skills: r.skills || "",
  score: r.score,
  source: r.source,
  fileUrl: r.file_url || r.fileUrl || "",
  format: r.format || "",
});

/** Format label from the file, like the profile's resume upload. */
const resumeFormatOf = (file) =>
  file.type === "application/pdf" || /\.pdf$/i.test(file.name)
    ? "PDF"
    : /\.docx?$/i.test(file.name)
      ? "DOCX"
      : "Text";

const profileSections = [
  { id: "basic", label: "My Profile" },
  { id: "viewProfile", label: "View Profile" },
  { id: "contact", label: "Contact Details" },
  { id: "qualification", label: "Qualification" },
  { id: "experience", label: "Experience" },
  { id: "achievements", label: "Achievements" },
  { id: "resume", label: "Resume" },
];

const navItems = [
  {
    label: "My Profile",
    icon: UserRound,
    path: "/teacher/profile",
    children: profileSections,
  },
  { label: "Dashboard", icon: LayoutDashboard, path: "/teacher/dashboard" },
  { label: "All Jobs", icon: BriefcaseBusiness, path: "/teacher/all-jobs" },
  { label: "Saved Jobs", icon: Bookmark, path: "/teacher/saved-jobs" },
  { label: "Applied Jobs", icon: ClipboardList, path: "/teacher/applications" },
  { label: "Interviews", icon: Calendar, path: "/teacher/interviews" },
  { label: "Recommendation", icon: Sparkles, path: "/teacher/recommendation" },
  { label: "Resume", icon: FileText, path: "/teacher/resume" },
  { label: "Recent Activity", icon: Clock3, path: "/teacher/activity" },
];

const TeacherLayout = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const location = useLocation();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(
    location.pathname === "/teacher/profile",
  );
  const [prevPathname, setPrevPathname] = useState(location.pathname);
  if (location.pathname !== prevPathname) {
    setPrevPathname(location.pathname);
    setMobileNavOpen(false);
  }

  const activeProfileSection =
    location.pathname === "/teacher/profile"
      ? new URLSearchParams(location.search).get("section") || "basic"
      : null;

  const goToProfileSection = (sectionId) => {
    navigate(`/teacher/profile?section=${sectionId}`);
  };

  // The teacher's own profile (GET /teachers/me) and the live job list (GET /jobs).
  const {
    profile: teacherProfile,
    raw: teacherProfileRaw,
    status: profileStatus,
    refresh: refreshTeacherProfile,
    apply: applyTeacherProfile,
  } = useOwnTeacherProfile();
  const { jobs: liveJobs, loading: jobsLoading } = usePublicJobs();
  const completion = profileCompletion(teacherProfile);

  const [profileImage, setProfileImage] = useState(null);
  const [localSavedJobs, setSavedJobs] = useState(() => {
    const saved = localStorage.getItem("skooljobs_saved_jobs");
    return saved ? JSON.parse(saved) : [];
  });
  const [activities, setActivities] = useState(() => {
    const saved = localStorage.getItem("skooljobs_teacher_activities");
    return saved ? JSON.parse(saved) : [];
  });

  // Live, approved jobs from the Job Posting service, scored against the teacher's profile.
  const allJobs = useMemo(() => {
    const matchProfile = toMatchProfile(teacherProfile) || loadTeacherMatchProfile();
    return liveJobs.map((j) => {
      const job = toTeacherJob(j);
      return { ...job, match: computeJobMatch(job, matchProfile) };
    });
  }, [liveJobs, teacherProfile]);

  const [localResumes, setResumes] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("skooljobs_resumes") || "[]");
      // Earlier versions stored the demo resumes here for every teacher: drop them.
      const demoNames = new Set(resumesData.map((r) => r.name));
      return Array.isArray(saved) ? saved.filter((r) => !demoNames.has(r.name)) : [];
    } catch {
      return [];
    }
  });

  // Resumes saved on the teacher profile carry the resume_id an application needs.
  const backendResumes = useMemo(
    () => (teacherProfile?.resumes || []).map(fromBackendResume).filter((r) => UUID_PATTERN.test(String(r.id))),
    [teacherProfile],
  );
  // Resumes just added from the apply dialog: shown until the profile reload has them (202).
  const [addedResumes, setAddedResumes] = useState([]);
  // The job being applied for: the apply dialog (choose or add a resume) is open for it.
  const [applyingJob, setApplyingJob] = useState(null);
  const resumes = useMemo(() => {
    const base = backendResumes.length > 0 ? backendResumes : localResumes;
    const known = new Set(base.map((r) => String(r.id)));
    return [...base, ...addedResumes.filter((r) => !known.has(String(r.id)))];
  }, [backendResumes, localResumes, addedResumes]);
  const [pickedResume, setSelectedResume] = useState(() => localResumes[0] || null);
  const selectedResume =
    (pickedResume && resumes.find((r) => String(r.id) === String(pickedResume.id))) || resumes[0] || null;

  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("currentUser") || "{}"); } catch { return {}; }
  });

  // Notifications (WebSocket, async-notification service) for the teacher area. teacher-profile
  // sends one when a saved change is stored: the screens waiting after a save then read the
  // profile once (refreshAfterSave), and an update nobody here started (an admin edit, a login
  // email change) is read once too, instead of polling GET /teachers/me. Other notifications
  // are shown as toasts.
  const [toasts, setToasts] = useState([]);
  const notificationUserId = currentUser?.id ? String(currentUser.id) : null;
  useEffect(() => {
    if (!notificationUserId || mockApiEnabled) return undefined;
    let toastId = 0;
    setNotificationStatus(notificationSocketOpen);
    connectNotificationSocket(notificationUserId, (notification) => {
      const fromTeacherProfile =
        notification?.appName === "teacher-profile" ||
        /TEACHER_PROFILE/.test(String(notification?.function || "")) ||
        (!notification?.appName && /teacher profile/i.test(String(notification?.message || "")));
      if (fromTeacherProfile) {
        if (signalProfileUpdated() === 0) {
          fetchOwnTeacherProfile({ fresh: true }).catch((error) =>
            console.warn("Couldn't read the profile after its update notification:", error),
          );
        }
        return;
      }
      if (!notification?.message) return;
      toastId += 1;
      const id = toastId;
      setToasts((prev) => [...prev, { id, message: notification.message, msgType: notification.msgType }]);
    });
    return () => {
      setNotificationStatus(null);
      disconnectNotificationSocket();
    };
  }, [notificationUserId]);

  // Applications and interviews (application service).
  const {
    applications,
    interviews: myInterviews,
    status: applicationsStatus,
    refresh: refreshApplications,
    patchApplications,
  } = useOwnApplications(currentUser.id);

  // Details of applied jobs no longer in the live list (closed, paused, expired).
  const [extraJobs, setExtraJobs] = useState({});
  useEffect(() => {
    const known = new Set(allJobs.map((j) => String(j.id)));
    const missing = [
      ...new Set(applications.map((a) => String(a.job_id)).filter((id) => id && !known.has(id) && !(id in extraJobs))),
    ];
    if (missing.length === 0) return undefined;
    let cancelled = false;
    Promise.all(
      missing.map((id) =>
        getJobById(id).then(
          ({ data }) => [id, toTeacherJob(mapPublicJob(data))],
          () => [id, null],
        ),
      ),
    ).then((entries) => {
      if (!cancelled) setExtraJobs((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    });
    return () => {
      cancelled = true;
    };
  }, [applications, allJobs, extraJobs]);

  /** Applied jobs (not withdrawn) as job cards, with the application's id and status. */
  const appliedJobs = useMemo(() => {
    const byId = new Map(allJobs.map((j) => [String(j.id), j]));
    return applications
      .filter((a) => a.status !== "withdrawn")
      .map((a) => {
        const jobId = String(a.job_id);
        const job = byId.get(jobId) || extraJobs[jobId] || { id: jobId, role: "Job", school: "" };
        return {
          ...job,
          id: jobId,
          applicationId: a.application_id,
          applicationStatus: a.status,
          status: APPLICATION_STATUS_LABELS[a.status] || "Under Review",
          appliedDate: a.applied_date,
          nextInterview: a.next_interview || null,
        };
      })
      .sort((x, y) => String(y.appliedDate || "").localeCompare(String(x.appliedDate || "")));
  }, [applications, allJobs, extraJobs]);

  // Persist candidate states

  useEffect(() => {
    localStorage.setItem("skooljobs_saved_jobs", JSON.stringify(localSavedJobs));
  }, [localSavedJobs]);

  // Bookmarks kept on the teacher profile (saved_jobs), shown when this browser has none yet.
  const savedJobs = useMemo(() => {
    if (localSavedJobs.length > 0) return localSavedJobs;
    const byId = new Map(allJobs.map((j) => [String(j.id), j]));
    return (teacherProfile?.savedJobs || [])
      .map((sj) => {
        const job = byId.get(String(sj.job_id || sj.jobId));
        return job ? { ...job, savedAt: sj.saved_at || sj.savedAt } : null;
      })
      .filter(Boolean);
  }, [localSavedJobs, allJobs, teacherProfile]);

  useEffect(() => {
    localStorage.setItem("skooljobs_teacher_activities", JSON.stringify(activities));
  }, [activities]);

  const [prevProfilePhoto, setPrevProfilePhoto] = useState(currentUser.profilePhoto);
  if (currentUser.profilePhoto !== prevProfilePhoto) {
    setPrevProfilePhoto(currentUser.profilePhoto);
    if (currentUser.profilePhoto) setProfileImage(currentUser.profilePhoto);
  }

  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
        setCurrentUser(user);
        if (user.profilePhoto) setProfileImage(user.profilePhoto);
      } catch {
        /* ignore malformed currentUser in storage */
      }

      const saved = localStorage.getItem("skooljobs_resumes");
      if (saved) {
        try {
          const list = JSON.parse(saved);
          setResumes(list);
          setSelectedResume((prev) => {
            if (!prev) return list[0] || null;
            const exists = list.find((r) => String(r.id) === String(prev.id));
            return exists || list[0] || null;
          });
        } catch {
          /* ignore malformed resumes in storage */
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    handleStorageChange();
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [location.pathname]);

  const recommendedJobs = useMemo(() => {
    const byMatch = [...allJobs].sort((a, b) => b.match - a.match);
    const focus = (
      selectedResume?.skill ||
      selectedResume?.skills?.split(",")[0]?.trim() ||
      teacherProfile?.mainSubject ||
      ""
    ).toLowerCase();
    if (!focus) return byMatch;
    const focused = byMatch.filter((job) => job.skill.toLowerCase() === focus);
    return focused.length ? focused : byMatch;
  }, [selectedResume, allJobs, teacherProfile]);

  if (!localStorage.getItem("currentUser")) {
    return <Navigate to="/app" replace />;
  }

  const displayName =
    teacherProfile?.fullName ||
    currentUser.name ||
    [currentUser.firstName, currentUser.lastName].filter(Boolean).join(" ") ||
    currentUser.email?.split("@")[0] ||
    "Teacher";
  const avatarUrl = profileImage || teacherProfile?.photoUrl || null;
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || "T";

  const addActivity = (message, type = "action") => {
    setActivities((prev) => [{ message, date: new Date().toISOString(), type }, ...prev]);
  };

  /** "Apply" on a job: open the dialog to choose the resume to send, or add one. */
  const handleApply = (job) => {
    if (appliedJobs.some((item) => String(item.id) === String(job.id))) return;
    if (!UUID_PATTERN.test(String(job.id))) {
      alert("This is a sample job and can't be applied to.");
      return;
    }
    setApplyingJob(job);
  };

  /**
   * POST /applications { job_id, resume_id } with the resume chosen in the dialog. 202: stored
   * a moment later, so the job shows as applied straight away and the list reloads shortly
   * after. Rejects with a message the dialog shows.
   */
  const submitApplication = async (job, chosen) => {
    // `npm run dev:mock` has no teacher-profile service: a resume without a real id uses a stand-in.
    const resume = UUID_PATTERN.test(String(chosen?.id))
      ? chosen
      : mockApiEnabled
        ? { id: "00000000-0000-4000-8000-0000000000aa" }
        : null;
    if (!resume) throw new Error("Choose a resume saved on your profile.");
    try {
      await applyToJob({ job_id: String(job.id), resume_id: String(resume.id) });
    } catch (error) {
      console.error("Application API apply failed:", error);
      const message = error?.response?.data?.message;
      throw new Error(message ? `Couldn't apply: ${message}` : "Couldn't send your application. Please try again.", {
        cause: error,
      });
    }
    setSelectedResume(chosen);
    patchApplications((prev) => [
      {
        application_id: null,
        job_id: String(job.id),
        teacher_user_id: String(currentUser.id),
        status: "submitted",
        applied_date: new Date().toISOString(),
        resume_id: String(resume.id),
      },
      ...prev,
    ]);
    refreshApplications(2000);
    addActivity(`Applied for ${job.role} at ${job.school}`, "apply");
    shareWithSchoolLocally(job);
  };

  /**
   * "Add Resume" in the apply dialog: the file goes to document-management (TEACHER_RESUME) and
   * the resume is added to the profile's resumes (POST /teachers/update, section "resumes"),
   * like the profile page's upload. Returns the new resume so it can be sent right away.
   */
  const addResumeForApply = async (file, title) => {
    if (!currentUser.id) throw new Error("Your session is missing a user id. Please log in again.");
    let fileUrl;
    try {
      fileUrl = await uploadDocumentRef({
        ownerId: String(currentUser.id),
        documentType: DOCUMENT_TYPES.TEACHER_RESUME,
        file,
        fileName: file.name,
      });
    } catch (error) {
      console.error("Resume upload failed:", error);
      throw new Error("Couldn't upload the resume file. Please try again.", { cause: error });
    }
    const resume = {
      id: crypto.randomUUID(),
      name: file.name,
      fileName: file.name,
      title,
      fileUrl,
      format: resumeFormatOf(file),
      source: "Uploaded",
      skill: teacherProfile?.mainSubject || "",
    };

    if (mockApiEnabled) {
      // No teacher-profile service: kept in this browser, like the profile page does.
      const list = [...localResumes, resume];
      localStorage.setItem("skooljobs_resumes", JSON.stringify(list));
      setResumes(list);
    } else {
      // The resumes section replaces the whole list: start from the profile as stored now (the
      // profile page may have changed it since this layout loaded it).
      let existing = Array.isArray(teacherProfileRaw?.resumes) ? teacherProfileRaw.resumes : [];
      try {
        const data = await fetchOwnTeacherProfile({ fresh: true });
        if (Array.isArray(data?.resumes)) existing = data.resumes;
      } catch (error) {
        console.warn("Couldn't reload the profile before saving the resume; using the loaded copy.", error);
      }
      const savedAt = saveStartedAt();
      try {
        await updateTeacherProfile({
          teacherId: teacherProfile?.teacherId || String(currentUser.id),
          teacher_user_id: String(currentUser.id),
          updated_sections: ["resumes"],
          resumes: [
            ...existing,
            {
              resume_id: resume.id,
              source: "uploaded",
              title: resume.title,
              file_name: resume.fileName,
              file_url: resume.fileUrl,
              format: resume.format,
              skill: resume.skill || null,
              score: null,
              full_name: teacherProfile?.fullName || null,
              email: teacherProfile?.email || null,
              mobile: teacherProfile?.mobile || null,
              is_active: true,
            },
          ],
        });
      } catch (error) {
        console.error("Saving the resume to the profile failed:", error);
        throw new Error("The file was uploaded, but saving the resume to your profile failed. Please try again.", {
          cause: error,
        });
      }
      // Stored a moment after the 202: read once the update notification comes (else
      // PROFILE_REFRESH polling) until the new resume is there.
      void refreshAfterSave(
        () => fetchOwnTeacherProfile({ fresh: true }),
        (data) => (data?.resumes || []).some((r) => String(r.resume_id || r.resumeId) === String(resume.id)),
        { since: savedAt },
      );
    }
    setAddedResumes((prev) => [...prev, resume]);
    setSelectedResume(resume);
    return resume;
  };

  /**
   * Temporary: the school's applicant list still reads the teacher's details from this
   * browser ("skooljobs_applicants"), because the teacher profile service can't yet return
   * a teacher's profile to a school (POST /teachers/batch is in the contract, not the
   * service). Remove once the school pages read applications + /teachers/batch.
   */
  const shareWithSchoolLocally = (job) => {
    try {
      const current = JSON.parse(localStorage.getItem("skooljobs_applicants") || "[]");
      const snapshot = applicantSnapshot(teacherProfile, { displayName, currentUser });
      const entry = {
        id: Date.now(),
        name: snapshot.name || displayName,
        subject: job.skill || teacherProfile?.mainSubject || "",
        experience: experienceYears(snapshot.experiences),
        status: "Applied",
        avatar: avatarUrl || "",
        jobTitle: job.role,
        qualification: snapshot.highestDegree || teacherProfile?.highestQualification1 || "",
        jobId: job.id,
        saved: false,
        candidateId: currentUser.id,
        profile: snapshot,
      };
      localStorage.setItem("skooljobs_applicants", JSON.stringify([entry, ...current]));
    } catch (error) {
      console.error("Error sharing the application locally:", error);
    }
  };

  /** POST /applications/withdraw; true when the service accepted it. */
  const handleWithdraw = async (job) => {
    if (!job.applicationId) {
      alert("Your application is still being saved. Please try again in a moment.");
      refreshApplications();
      return false;
    }
    try {
      await withdrawApplication(job.applicationId);
    } catch (error) {
      console.error("Application API withdraw failed:", error);
      const message = error?.response?.data?.message;
      alert(message ? `Couldn't withdraw: ${message}` : "Could not withdraw the application. Please try again.");
      return false;
    }
    patchApplications((prev) =>
      prev.map((a) => (a.application_id === job.applicationId ? { ...a, status: "withdrawn" } : a)),
    );
    refreshApplications(2000);
    addActivity(`Withdrew application for ${job.role} at ${job.school}`, "withdraw");
    return true;
  };

  // Backend-sync for the savedJobs section. The TeacherEntity.savedJobs
  // contract field is UUID-typed (job_id); the job list now comes from the
  // Job Posting service (real UUIDs). Non-UUID ids (jobs saved before, from
  // the old demo list) are skipped rather than sent and rejected.
  const submitSavedJobs = async (jobs) => {
    if (!currentUser.id) return;
    const validJobs = jobs.filter((j) => UUID_PATTERN.test(String(j.id)));
    if (validJobs.length !== jobs.length) {
      console.warn(
        "Skipping backend sync for saved jobs with non-UUID ids (mock job data):",
        jobs.filter((j) => !UUID_PATTERN.test(String(j.id))).map((j) => j.id),
      );
    }
    try {
      await updateTeacherProfile({
        teacherId: String(currentUser.id),
        teacher_user_id: String(currentUser.id),
        updated_sections: ["savedJobs"],
        savedJobs: validJobs.map((j) => ({
          job_id: j.id,
          saved_at: j.savedAt || new Date().toISOString(),
        })),
      });
    } catch (error) {
      console.error("Failed to save bookmarked jobs to the server:", error);
    }
  };

  const handleSave = (job) => {
    let updated;
    if (savedJobs.some((item) => item.id === job.id)) {
      updated = savedJobs.filter((item) => item.id !== job.id);
      setSavedJobs(updated);
      addActivity(`Removed bookmark for ${job.role} at ${job.school}`, "unsave");
    } else {
      updated = [...savedJobs, job];
      setSavedJobs(updated);
      addActivity(`Saved ${job.role} at ${job.school}`, "save");
    }
    submitSavedJobs(updated);
  };

  // Ends the signup-service session (POST /auth/logout) and clears "currentUser".
  const handleLogout = async () => {
    localStorage.removeItem("userName");
    // To the website home page first: ending the session while still on a protected page
    // would make its route guard send the user to /login instead.
    navigate("/", { replace: true });
    await signOut();
  };

  const outletCtx = {
    profileImage,
    setProfileImage,
    appliedJobs,
    applicationsStatus,
    refreshApplications,
    handleWithdraw,
    myInterviews,
    savedJobs,
    setSavedJobs,
    activities,
    setActivities,
    addActivity,
    resumes,
    setResumes,
    selectedResume,
    setSelectedResume,
    recommendedJobs,
    allJobs,
    handleApply,
    handleSave,
    currentUser,
    displayName,
    handleLogout,
    // From GET /teachers/me (null while loading or when it has no profile yet)
    teacherProfile,
    profileStatus,
    profileCompletion: completion,
    refreshTeacherProfile,
    applyTeacherProfile,
    jobsLoading,
  };

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <BrandLogo onDark height={44} className={styles.brandLogo} />
          <div className={styles.profileCard}>
            <div className={styles.profileRow}>
              {avatarUrl ? (
                <DocumentImage src={avatarUrl} alt="profile" className={styles.profileAvatar} />
              ) : (
                <span className={`${styles.profileAvatar} ${styles.profileInitials}`} aria-hidden="true">
                  {initials}
                </span>
              )}
              <div>
                <h1 className={styles.profileName}>{displayName}</h1>
                <p className={styles.profileSubtitle}>Teacher Account</p>
              </div>
            </div>
          </div>

          <div className={styles.scoreCard}>
            <div className={styles.scoreHeader}>
              <span>Profile Score</span>
              <div className={styles.scoreActions}>
                <span>{completion}%</span>
                <button
                  type="button"
                  onClick={() => navigate("/teacher/profile")}
                  className={styles.completeButton}
                >
                  <UserRound size={11} /> Complete
                </button>
              </div>
            </div>
            <div className={styles.scoreTrack}>
              <div className={styles.scoreFill} style={{ width: `${completion}%` }} />
            </div>
          </div>

          <nav className={styles.nav}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');

              if (item.children) {
                return (
                  <div key={item.path} className={styles.navGroup}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isActive) navigate(item.path);
                        setProfileMenuOpen((open) => !open);
                      }}
                      aria-expanded={profileMenuOpen}
                      className={`${styles.navButton} ${styles.navGroupButton} ${
                        isActive ? styles.navButtonActive : ""
                      }`}
                    >
                      <Icon size={18} /> {item.label}
                      <ChevronDown
                        size={14}
                        className={`${styles.navChevron} ${
                          profileMenuOpen ? styles.navChevronOpen : ""
                        }`}
                      />
                    </button>
                    {profileMenuOpen && (
                      <div className={styles.subNav}>
                        {item.children.map((child) => (
                          <button
                            key={child.id}
                            type="button"
                            onClick={() => goToProfileSection(child.id)}
                            className={`${styles.subNavButton} ${
                              activeProfileSection === child.id
                                ? styles.subNavButtonActive
                                : ""
                            }`}
                          >
                            {child.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={`${styles.navButton} ${
                    isActive ? styles.navButtonActive : ""
                  }`}
                >
                  <Icon size={18} /> {item.label}
                </button>
              );
            })}
          </nav>

          <div className={styles.bottomNav}>
            <button
              onClick={() => navigate("/teacher/settings")}
              className={`${styles.navButton} ${
                (location.pathname === "/teacher/settings" || location.pathname.startsWith("/teacher/settings/")) ? styles.navButtonActive : ""
              }`}
              type="button"
            >
              <Settings size={18} /> Settings
            </button>
            <button
              onClick={handleLogout}
              className={styles.logoutButton}
              type="button"
            >
              <LogOut size={18} /> Logout
            </button>
          </div>
        </aside>

        <main className={styles.main}>
          <div className={styles.mobileNavWrap}>
            <div className={styles.mobileNavBar}>
              <BrandLogo height={30} className={styles.mobileNavLogo} />
              <span className={styles.mobileNavTitle}>
                {[...navItems, { label: "Settings", path: "/teacher/settings" }].find(
                  (item) => item.path === location.pathname,
                )?.label || "Menu"}
              </span>
              <button
                type="button"
                onClick={() => setMobileNavOpen((o) => !o)}
                aria-label="Toggle navigation menu"
                aria-expanded={mobileNavOpen}
                className={styles.mobileNavToggle}
              >
                {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>

            {mobileNavOpen && (
              <div className={styles.mobileNavMenu}>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');

                  if (item.children) {
                    return (
                      <div key={item.path} className={styles.mobileNavGroup}>
                        <button
                          type="button"
                          onClick={() => navigate(item.path)}
                          className={`${styles.mobileNavButton} ${
                            isActive ? styles.mobileNavButtonActive : ""
                          }`}
                        >
                          <Icon size={17} />
                          {item.label}
                        </button>
                        <div className={styles.mobileSubNav}>
                          {item.children.map((child) => (
                            <button
                              key={child.id}
                              type="button"
                              onClick={() => goToProfileSection(child.id)}
                              className={`${styles.mobileSubNavButton} ${
                                activeProfileSection === child.id
                                  ? styles.mobileSubNavButtonActive
                                  : ""
                              }`}
                            >
                              {child.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => navigate(item.path)}
                      className={`${styles.mobileNavButton} ${
                        isActive ? styles.mobileNavButtonActive : ""
                      }`}
                    >
                      <Icon size={17} />
                      {item.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => navigate("/teacher/settings")}
                  className={`${styles.mobileNavButton} ${
                    (location.pathname === "/teacher/settings" || location.pathname.startsWith("/teacher/settings/")) ? styles.mobileNavButtonActive : ""
                  }`}
                >
                  <Settings size={17} />
                  Settings
                </button>
              </div>
            )}
          </div>
          <NotificationToasts toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
          <div className={styles.outletWrap}>
            <Outlet context={outletCtx} />
          </div>
          {applyingJob && (
            <ApplyDialog
              job={applyingJob}
              resumes={resumes}
              initialResumeId={selectedResume?.id}
              onAddResume={addResumeForApply}
              onApply={(resume) => submitApplication(applyingJob, resume)}
              onCreateOnProfile={() => {
                setApplyingJob(null);
                navigate("/teacher/profile?section=resume");
              }}
              onClose={() => setApplyingJob(null)}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default TeacherLayout;
