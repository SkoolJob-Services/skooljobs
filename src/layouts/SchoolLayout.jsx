import { useEffect, useMemo, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import {
  BriefcaseBusiness,
  Building2,
  Calendar,
  CreditCard,
  Eye,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PlusCircle,
  Settings,
  Upload,
  Users,
  X,
} from "lucide-react";
import Topbar from "../components/topbar";
import { initialJobs, initialApplicants } from "../lib/schooldata";
import { useImageUpload } from "../lib/useImageUpload";
import styles from "./SchoolLayout.module.css";

const augmentedJobs = [...initialJobs]
  .sort((a, b) => new Date(b.date) - new Date(a.date))
  .map((j) => ({ ...j, roleType: "Teaching", vacancies: 2, expiryDate: "30 Jun 2025" }));

const augmentedApplicants = initialApplicants.map((a, i) => ({
  ...a,
  jobTitle: ["Math Teacher", "English Teacher", "Science Teacher", "Hindi Teacher", "Math Teacher"][i],
  qualification: ["B.Ed + M.Sc", "B.Ed + MA English", "B.Ed + B.Sc", "MA Hindi + B.Ed", "M.Sc + B.Ed"][i],
  saved: false,
}));

const sidebarItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/school/dashboard" },
  { label: "Institute Profile", icon: Building2, path: "/school/profile" },
  { label: "View Profile", icon: Eye, path: "/school/view-profile" },
  { label: "Post a New Job", icon: PlusCircle, path: "/school/post-job" },
  { label: "Manage Jobs", icon: BriefcaseBusiness, path: "/school/manage-jobs" },
  { label: "All Applicants", icon: Users, path: "/school/all-applicants" },
  { label: "Interviews", icon: Calendar, path: "/school/interviews" },
  { label: "Saved Candidates", icon: Heart, path: "/school/saved-candidates" },
  { label: "Packages", icon: Package, path: "/school/packages" },
  { label: "Transactions", icon: CreditCard, path: "/school/transactions" },
  { label: "Settings", icon: Settings, path: "/school/settings" },
];

const SchoolLayout = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const location = useLocation();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(location.pathname);
  if (location.pathname !== prevPathname) {
    setPrevPathname(location.pathname);
    setMobileNavOpen(false);
  }

  const [jobs, setJobs] = useState(() => {
    const saved = localStorage.getItem("skooljobs_jobs");
    if (saved) {
      try { return JSON.parse(saved); } catch { return augmentedJobs; }
    }
    return augmentedJobs;
  });
  const [applicants, setApplicants] = useState(() => {
    const saved = localStorage.getItem("skooljobs_applicants");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((a) => a.status === "Applied" ? { ...a, status: "Not Reviewed" } : a);
      } catch {
        return augmentedApplicants;
      }
    }
    return augmentedApplicants;
  });

  useEffect(() => {
    localStorage.setItem("skooljobs_jobs", JSON.stringify(jobs));
  }, [jobs]);

  useEffect(() => {
    localStorage.setItem("skooljobs_applicants", JSON.stringify(applicants));
  }, [applicants]);

  const [logoImage, setLogoImage] = useState(null);
  const {
    error: logoImageError,
    validating: logoImageValidating,
    validateAndProcess: validateLogoImage,
  } = useImageUpload("logo");
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, msg: "New application from Rahul Sharma for Math Teacher", time: "2h ago", read: false },
    { id: 2, msg: "Priya Singh accepted your interview invitation", time: "5h ago", read: false },
    { id: 3, msg: "English Teacher job post is now live", time: "1d ago", read: true },
    { id: 4, msg: "Profile viewed by 3 candidates today", time: "2d ago", read: true },
  ]);
  const [interviews, setInterviews] = useState(() => {
    const saved = localStorage.getItem("skooljobs_interviews");
    if (saved) {
      try { return JSON.parse(saved); } catch { /* fall through to defaults below */ }
    }
    const initial = [
      {
        id: 1,
        candidateId: 1,
        candidateName: "Rahul Sharma",
        jobTitle: "Math Teacher",
        school: "Sunrise Public School",
        date: "2026-06-06",
        time: "10:00",
        duration: "60 Minutes",
        mode: "Online",
        onlinePlatform: "Zoom",
        meetingLink: "https://zoom.us/j/1234567890",
        round: "1st Round",
        notesForCandidate: "Interview will cover algebra, calculus curriculum design, and mock classroom demo. Please join the link 5 mins early.",
        status: "Scheduled",
      },
      {
        id: 2,
        candidateId: 1,
        candidateName: "Rahul Sharma",
        jobTitle: "Science Teacher",
        school: "Green Valley School",
        date: "2026-06-12",
        time: "14:00",
        duration: "60 Minutes",
        mode: "In-Person",
        round: "Final Round",
        notesForCandidate: "Management round. Please carry printed copies of your B.Ed certificates, resume, and experience letters to the school front desk.",
        location: "Sector 12, Kolar Road, Bhopal",
        status: "Scheduled",
      },
      {
        id: 3,
        candidateId: 1,
        candidateName: "Rahul Sharma",
        jobTitle: "English Teacher",
        school: "EduHire Recruiters",
        date: "2026-05-28",
        time: "11:30",
        duration: "45 Minutes",
        mode: "Online",
        onlinePlatform: "Google Meet",
        meetingLink: "https://meet.google.com/abc-defg-hjk",
        round: "HR Round",
        notesForCandidate: "Basic communication and background screening.",
        status: "Completed",
      },
      {
        id: 101,
        candidateId: 999,
        candidateName: "Priya Singh",
        jobTitle: "English Teacher",
        school: "Green Valley School",
        date: "2026-06-02",
        time: "10:00",
        duration: "45 Minutes",
        mode: "Online",
        onlinePlatform: "Google Meet",
        meetingLink: "https://meet.google.com/abc-defg-hjk",
        round: "1st Round",
        interviewer: "",
        notesForCandidate: "",
        status: "Confirmed",
      },
      {
        id: 102,
        candidateId: 998,
        candidateName: "Suresh Verma",
        jobTitle: "Math Teacher",
        school: "Green Valley School",
        date: "2026-06-03",
        time: "14:00",
        duration: "45 Minutes",
        mode: "In-Person",
        location: "Sector 12, Kolar Road, Bhopal",
        round: "1st Round",
        interviewer: "",
        notesForCandidate: "",
        status: "Pending",
      },
    ];
    localStorage.setItem("skooljobs_interviews", JSON.stringify(initial));
    return initial;
  });

  useEffect(() => {
    localStorage.setItem("skooljobs_interviews", JSON.stringify(interviews));
  }, [interviews]);

  const currentUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("currentUser") || "{}"); } catch { return {}; }
  }, []);

  if (!localStorage.getItem("currentUser")) {
    return <Navigate to="/" replace />;
  }

  const schoolName = currentUser.companyName || currentUser.schoolName || currentUser.firstName || "Som Lalit School";
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Ends the signup-service session (POST /auth/logout) and clears "currentUser".
  const handleLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const url = await validateLogoImage(file);
    if (url) setLogoImage(url);
  };

  const handleMarkRead = (id) => {
    setNotifications((p) => p.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const handleDeleteNotification = (id) => {
    setNotifications((p) => p.filter((n) => n.id !== id));
  };

  const handleSaveCandidate = (id) => {
    setApplicants((p) => p.map((a) => (a.id === id ? { ...a, saved: !a.saved } : a)));
  };

  const notificationDropdown = showNotifDropdown && (
    <div className={styles.notifDropdown}>
      <div className={styles.notifHeader}>
        <p className={styles.notifHeaderTitle}>
          Notifications {unreadCount > 0 && <span className={styles.notifHeaderBadge}>({unreadCount} new)</span>}
        </p>
        <div className={styles.notifHeaderActions}>
          <button
            type="button"
            onClick={() => setNotifications((p) => p.map((n) => ({ ...n, read: true })))}
            className={styles.notifMarkAllRead}
          >
            Mark all read
          </button>
          <button
            type="button"
            onClick={() => setShowNotifDropdown(false)}
            className={styles.notifCloseButton}
          >
            <X size={14} />
          </button>
        </div>
      </div>
      <div className={styles.notifList}>
        {notifications.length === 0 ? (
          <p className={styles.notifEmpty}>No notifications</p>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleMarkRead(n.id)}
              className={`${styles.notifItem} ${n.read ? "" : styles.notifItemUnread}`}
            >
              <span className={`${styles.notifDot} ${n.read ? "" : styles.notifDotUnread}`} />
              <div className={styles.notifBody}>
                <p className={styles.notifMessage}>{n.msg}</p>
                <p className={styles.notifTime}>{n.time}</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleDeleteNotification(n.id); }}
                className={styles.notifDeleteButton}
              >
                <X size={13} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const outletCtx = {
    jobs,
    setJobs,
    applicants,
    setApplicants,
    logoImage,
    notifications,
    setNotifications,
    interviews,
    setInterviews,
    currentUser,
    schoolName,
    handleLogout,
    handleSaveCandidate,
  };

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarInner}>
            <label className={styles.logoUploadLabel}>
              <Upload size={13} />
              {logoImageValidating ? "Checking..." : "Upload Institute Logo"}
              <input
                type="file"
                hidden
                accept="image/*"
                disabled={logoImageValidating}
                onChange={handleLogoUpload}
              />
            </label>
            {logoImageError && (
              <p className={styles.uploadError}>{logoImageError}</p>
            )}

            <div className={styles.schoolInfoRow}>
              <div className={styles.logoBox}>
                {logoImage ? (
                  <img src={logoImage} alt="logo" className={styles.logoImage} />
                ) : (
                  <Building2 size={22} className={styles.logoIcon} />
                )}
              </div>
              <div className={styles.schoolInfoText}>
                <p className={styles.schoolName}>{schoolName}</p>
                <p className={styles.schoolAccountLabel}>School Account</p>
              </div>
            </div>

            <nav className={styles.nav}>
              {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => navigate(item.path)}
                    className={`${styles.navButton} ${
                      isActive ? styles.navButtonActive : ""
                    }`}
                  >
                    <Icon size={17} />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className={styles.sidebarFooter}>
              <button
                type="button"
                onClick={handleLogout}
                className={styles.logoutButton}
              >
                <LogOut size={17} /> Logout
              </button>
            </div>
          </div>
        </aside>

        <main className={styles.main}>
          <Topbar
            title="School Dashboard"
            subtitle="Manage your job postings and track applicants."
            unreadCount={unreadCount}
            onNotificationClick={() => setShowNotifDropdown((v) => !v)}
            notificationDropdown={notificationDropdown}
          />

          <div className={styles.mobileNavWrap}>
            <div className={styles.mobileNavBar}>
              <span className={styles.mobileNavTitle}>
                {sidebarItems.find((item) => item.path === location.pathname)?.label || "Menu"}
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
                {sidebarItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
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

export default SchoolLayout;
