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
import { applyToJob } from "../services/applicationService";
import {
  applicantSnapshot,
  experienceYears,
  profileCompletion,
  toMatchProfile,
  useOwnTeacherProfile,
} from "../features/teacher/ownTeacherProfile";
import { usePublicJobs } from "../site/hooks/usePublicJobs";
import {
  updateTeacherProfile,
} from "../services/teacherprofileService";
import styles from "./TeacherLayout.module.css";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    status: profileStatus,
    refresh: refreshTeacherProfile,
  } = useOwnTeacherProfile();
  const { jobs: liveJobs, loading: jobsLoading } = usePublicJobs();
  const completion = profileCompletion(teacherProfile);

  const [profileImage, setProfileImage] = useState(null);
  const [appliedJobs, setAppliedJobs] = useState(() => {
    const saved = localStorage.getItem("skooljobs_applied_jobs");
    return saved ? JSON.parse(saved) : [];
  });
  const [savedJobs, setSavedJobs] = useState(() => {
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
      const job = {
        id: j.id,
        role: j.title || "Teaching Position",
        school: j.school || "",
        location: j.location || "",
        type: j.employmentType || "",
        salary: j.salary || "",
        skill: j.subject || "",
        description: j.description,
        qualifications: j.qualifications.join(", "),
        roleType: j.roleCategory,
        postedDate: j.postedDate,
      };
      return { ...job, match: computeJobMatch(job, matchProfile) };
    });
  }, [liveJobs, teacherProfile]);

  const [resumes, setResumes] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("skooljobs_resumes") || "[]");
      // Earlier versions stored the demo resumes here for every teacher: drop them.
      const demoNames = new Set(resumesData.map((r) => r.name));
      return Array.isArray(saved) ? saved.filter((r) => !demoNames.has(r.name)) : [];
    } catch {
      return [];
    }
  });

  const [selectedResume, setSelectedResume] = useState(() => resumes[0] || null);

  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("currentUser") || "{}"); } catch { return {}; }
  });

  // Persist candidate states
  useEffect(() => {
    localStorage.setItem("skooljobs_applied_jobs", JSON.stringify(appliedJobs));
  }, [appliedJobs]);

  useEffect(() => {
    localStorage.setItem("skooljobs_saved_jobs", JSON.stringify(savedJobs));
  }, [savedJobs]);

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

  const handleApply = (job) => {
    if (!appliedJobs.some((item) => item.id === job.id)) {
      setAppliedJobs((prev) => [...prev, { ...job, appliedDate: new Date().toISOString() }]);
      addActivity(`Applied for ${job.role} at ${job.school}`, "apply");

      // Submit to the Application API. The local list above stays the UI's
      // source of truth until jobs/resumes carry backend IDs, so a failed
      // call is logged rather than blocking the apply.
      if (selectedResume?.id != null) {
        applyToJob({ job_id: String(job.id), resume_id: String(selectedResume.id) })
          .catch((err) => console.error("Application API apply failed:", err));
      }

      // Sync application to recruiter applicants list in localStorage
      try {
        const savedApplicantsStr = localStorage.getItem("skooljobs_applicants");
        const currentApplicants = savedApplicantsStr ? JSON.parse(savedApplicantsStr) : [];
        
        const localProfile = JSON.parse(localStorage.getItem("skooljobs_teacher_data") || "{}");
        const teacherQualifications = JSON.parse(localStorage.getItem("skooljobs_teacher_qualifications") || "[]");
        const highestQual =
          teacherQualifications[0]?.degree ||
          localProfile.highestQualificationOne ||
          teacherProfile?.highestQualification1 ||
          "";

        const snapshot = applicantSnapshot(teacherProfile, { displayName, currentUser });
        const newApplicant = {
          id: Date.now(),
          name: `${localProfile.firstName || teacherProfile?.firstName || ""} ${localProfile.lastName || teacherProfile?.lastName || ""}`.trim() || displayName,
          subject: job.skill || teacherProfile?.mainSubject || "",
          experience: experienceYears(snapshot.experiences),
          status: "Applied",
          avatar: localProfile.profilePhoto || avatarUrl || "",
          jobTitle: job.role,
          qualification: snapshot.highestDegree || highestQual,
          jobId: job.id,
          saved: false,
          candidateId: currentUser.id,
          // The applicant's real details for the school (no API lets a school read a profile yet).
          profile: snapshot,
        };

        localStorage.setItem("skooljobs_applicants", JSON.stringify([newApplicant, ...currentApplicants]));
      } catch (err) {
        console.error("Error syncing application:", err);
      }
    }
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
    await signOut();
    navigate("/login", { replace: true });
  };

  const outletCtx = {
    profileImage,
    setProfileImage,
    appliedJobs,
    setAppliedJobs,
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
    jobsLoading,
  };

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <div className={styles.profileCard}>
            <div className={styles.profileRow}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="profile" className={styles.profileAvatar} />
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
          <div className={styles.outletWrap}>
            <Outlet context={outletCtx} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default TeacherLayout;
