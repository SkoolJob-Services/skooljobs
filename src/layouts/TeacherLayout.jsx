import { useEffect, useMemo, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
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
import { jobsData, resumesData } from "../lib/teacherdata";
import { computeJobMatch, loadTeacherMatchProfile } from "../lib/jobMatch";
import { applyToJob } from "../services/applicationService";
import styles from "./TeacherLayout.module.css";

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

  const [profileImage, setProfileImage] = useState("https://i.pravatar.cc/300?img=12");
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
    return saved ? JSON.parse(saved) : [
      {
        message: "Profile viewed by Green Valley School",
        date: new Date(Date.now() - 3600000).toISOString(),
        type: "view",
      },
    ];
  });

  const allJobs = useMemo(() => {
    const matchProfile = loadTeacherMatchProfile();
    const savedRecruiterJobsStr = localStorage.getItem("skooljobs_jobs");
    const recruiterJobs = savedRecruiterJobsStr ? JSON.parse(savedRecruiterJobsStr) : [];
    const normalizedRecruiter = recruiterJobs
      .filter((j) => j.status === "Active" || j.status === "Scheduled")
      .map((j) => {
        const job = {
          id: j.id,
          role: j.title || "Teaching Position",
          school: j.schoolName || j.companyName || "Green Valley School",
          location: j.location || "Bhopal, MP",
          type: j.employmentType || "Full Time",
          salary: j.salaryRange || "Competitive",
          skill: j.subject || "Teaching",
          description: j.description,
          requirements: j.requirements,
          qualifications: j.qualifications,
          expiryDate: j.expiryDate,
          vacancies: j.vacancies,
          roleType: j.roleType,
        };
        return { ...job, match: computeJobMatch(job, matchProfile) };
      });
    const matchedStaticJobs = jobsData.map((job) => ({
      ...job,
      match: computeJobMatch(job, matchProfile),
    }));
    return [...normalizedRecruiter, ...matchedStaticJobs];
  }, []);

  const [resumes, setResumes] = useState(() => {
    const saved = localStorage.getItem("skooljobs_resumes");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return resumesData;
      }
    }
    // Set default in localStorage
    localStorage.setItem("skooljobs_resumes", JSON.stringify(resumesData));
    return resumesData;
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
    if (!selectedResume) return allJobs;
    const skillFocus = selectedResume.skill || selectedResume.skills?.split(",")[0]?.trim() || "Teaching";
    return allJobs.filter((job) => job.skill.toLowerCase() === skillFocus.toLowerCase());
  }, [selectedResume, allJobs]);

  if (!localStorage.getItem("currentUser")) {
    return <Navigate to="/" replace />;
  }

  const displayName = currentUser.name || currentUser.firstName || "Gopal";

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
        
        const teacherProfile = JSON.parse(localStorage.getItem("skooljobs_teacher_data") || "{}");
        const teacherQualifications = JSON.parse(localStorage.getItem("skooljobs_teacher_qualifications") || "[]");
        const highestQual = teacherQualifications[0]?.degree || teacherProfile.highestQualificationOne || "B.Ed";

        const newApplicant = {
          id: Date.now(),
          name: `${teacherProfile.firstName || currentUser.firstName || "Rahul"} ${teacherProfile.lastName || currentUser.lastName || "Sharma"}`.trim(),
          subject: job.skill || "Mathematics",
          experience: teacherProfile.age ? `${Math.max(1, parseInt(teacherProfile.age) - 22)} yrs` : "3 yrs",
          status: "Applied",
          avatar: teacherProfile.profilePhoto || profileImage || "https://i.pravatar.cc/100?img=12",
          jobTitle: job.role,
          qualification: highestQual,
          saved: false,
          candidateId: currentUser.id || 1,
        };

        localStorage.setItem("skooljobs_applicants", JSON.stringify([newApplicant, ...currentApplicants]));
      } catch (err) {
        console.error("Error syncing application:", err);
      }
    }
  };

  const handleSave = (job) => {
    if (savedJobs.some((item) => item.id === job.id)) {
      setSavedJobs((prev) => prev.filter((item) => item.id !== job.id));
      addActivity(`Removed bookmark for ${job.role} at ${job.school}`, "unsave");
    } else {
      setSavedJobs((prev) => [...prev, job]);
      addActivity(`Saved ${job.role} at ${job.school}`, "save");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("userName");
    navigate("/");
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
  };

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <div className={styles.profileCard}>
            <div className={styles.profileRow}>
              <img
                src={profileImage}
                alt="profile"
                className={styles.profileAvatar}
              />
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
                <span>86%</span>
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
              <div className={styles.scoreFill} style={{ width: "86%" }} />
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
