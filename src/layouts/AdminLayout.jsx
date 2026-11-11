import { useEffect, useMemo, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import {
  BriefcaseBusiness,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  PlusCircle,
  UserPlus,
  X,
} from "lucide-react";
import styles from "./AdminLayout.module.css";

const sidebarItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" },
  { label: "Invite Schools", icon: UserPlus, path: "/admin/invite-schools" },
  { label: "Job Approvals", icon: ClipboardCheck, path: "/admin/job-approvals" },
  { label: "Post a New Job", icon: PlusCircle, path: "/admin/post-job" },
  { label: "Manage Jobs", icon: BriefcaseBusiness, path: "/admin/manage-jobs" },
];

// Header titles for every admin route, including the ones not in the sidebar.
const pageTitles = {
  "/admin/dashboard": "Dashboard",
  "/admin/invite-schools": "Invite Schools",
  "/admin/job-approvals": "Job Approvals",
  "/admin/jobs": "All Jobs",
  "/admin/schools": "Schools",
  "/admin/post-job": "Post a New Job",
  "/admin/manage-jobs": "Manage Jobs",
};

const isActivePath = (pathname, path) =>
  pathname === path || pathname.startsWith(path + "/");

const initialsOf = (text) =>
  text
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

const AdminLayout = () => {
  const navigate = useNavigate();
  const { signOut, session } = useAuth();
  const location = useLocation();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(location.pathname);
  if (location.pathname !== prevPathname) {
    setPrevPathname(location.pathname);
    setMobileNavOpen(false);
  }

  useEffect(() => {
    if (!mobileNavOpen) return undefined;
    const onKey = (e) => e.key === "Escape" && setMobileNavOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileNavOpen]);

  const [jobs, setJobs] = useState(() => {
    const saved = localStorage.getItem("skooljobs_jobs");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem("skooljobs_jobs", JSON.stringify(jobs));
  }, [jobs]);

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("currentUser") || "{}");
    } catch {
      return {};
    }
  }, []);

  if (!localStorage.getItem("currentUser") || currentUser.role !== "admin") {
    return <Navigate to="/app" replace />;
  }

  // Ends the signup-service session (POST /auth/logout) and clears "currentUser".
  const handleLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  // Signed-in admin from the session — nothing is shown if the session has no name/email.
  const adminName =
    currentUser.name ||
    [currentUser.firstName, currentUser.lastName].filter(Boolean).join(" ");
  const adminContact = currentUser.email || session?.identifier || "";
  const adminLabel = adminName || adminContact;

  const pageTitle =
    Object.entries(pageTitles).find(([path]) =>
      isActivePath(location.pathname, path),
    )?.[1] || "Platform Admin";

  // Jobs this admin posted for schools (Manage Jobs), and the schools they can post for:
  // the account's own list plus every school that already has a job.
  const myJobs = jobs.filter((j) => j.schoolEmail === currentUser.email);
  const managedSchools = Array.from(
    new Set([
      ...(currentUser.managedSchools || []),
      ...jobs.map((j) => j.schoolName).filter(Boolean),
    ]),
  );

  const outletCtx = { jobs, setJobs, myJobs, currentUser, managedSchools };

  const navList = (
    <nav className={styles.nav} aria-label="Platform admin">
      {sidebarItems.map((item) => {
        const Icon = item.icon;
        const isActive = isActivePath(location.pathname, item.path);
        return (
          <button
            key={item.path}
            type="button"
            onClick={() => navigate(item.path)}
            aria-current={isActive ? "page" : undefined}
            className={`${styles.navButton} ${isActive ? styles.navButtonActive : ""}`}
          >
            <Icon size={18} aria-hidden="true" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className={styles.page}>
      {mobileNavOpen && (
        <div
          className={styles.backdrop}
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`${styles.sidebar} ${mobileNavOpen ? styles.sidebarOpen : ""}`}
        id="admin-sidebar"
      >
        <div className={styles.brandRow}>
          <div className={styles.brandMark} aria-hidden="true">SJ</div>
          <div className={styles.brandText}>
            <p className={styles.brandName}>SkoolJobs</p>
            <p className={styles.brandSub}>Platform Admin</p>
          </div>
          <button
            type="button"
            className={styles.sidebarClose}
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close navigation menu"
          >
            <X size={20} />
          </button>
        </div>

        {navList}

        <div className={styles.sidebarFooter}>
          <button type="button" onClick={handleLogout} className={styles.logoutButton}>
            <LogOut size={18} aria-hidden="true" /> Logout
          </button>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button
              type="button"
              className={styles.menuToggle}
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={mobileNavOpen}
              aria-controls="admin-sidebar"
            >
              <Menu size={20} />
            </button>
            <div className={styles.headerTitles}>
              <p className={styles.headerContext}>Platform Admin</p>
              <h1 className={styles.headerTitle}>{pageTitle}</h1>
            </div>
          </div>

          {adminLabel && (
            <div className={styles.profile}>
              <div className={styles.profileText}>
                <p className={styles.profileName}>{adminLabel}</p>
                {adminName && adminContact && (
                  <p className={styles.profileSub}>{adminContact}</p>
                )}
              </div>
              {currentUser.profilePhoto ? (
                <img src={currentUser.profilePhoto} alt="" className={styles.avatar} />
              ) : (
                <span className={styles.avatar} aria-hidden="true">
                  {initialsOf(adminLabel)}
                </span>
              )}
            </div>
          )}
        </header>

        <main className={styles.content}>
          <Outlet context={outletCtx} />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
