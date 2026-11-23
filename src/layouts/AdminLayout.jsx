import { PersonAvatar } from "../components/PersonAvatar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import {
  BriefcaseBusiness,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  PlusCircle,
  UserPlus,
  X,
  Settings,
} from "lucide-react";
import styles from "./AdminLayout.module.css";
import { BrandLogo } from "../components/BrandLogo";
import { isLocalSession } from "../features/auth/localAccounts";
import { mockApiEnabled } from "../api";
import { listJobs } from "../services/jobService";
import { listAllSchoolProfiles } from "../services/schoolProfileService";
import { fromJobResponse } from "../pages/admin/jobStatus";

const sidebarItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" },
  { label: "Invite Schools", icon: UserPlus, path: "/admin/invite-schools" },
  { label: "Job Approvals", icon: ClipboardCheck, path: "/admin/job-approvals" },
  { label: "Post a New Job", icon: PlusCircle, path: "/admin/post-job" },
  { label: "Manage Jobs", icon: BriefcaseBusiness, path: "/admin/manage-jobs" },
  { label: "Teachers", icon: GraduationCap, path: "/admin/teachers" },
  { label: "Settings", icon: Settings, path: "/admin/settings" },
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
  "/admin/teachers": "Teachers",
};

const isActivePath = (pathname, path) =>
  pathname === path || pathname.startsWith(path + "/");

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

  // Jobs posted by schools, from the job service (GET /jobs: ADMIN sees every job of the
  // tenant, newest first). The local admin login (localAccounts) has no server token, so
  // its pages keep using the jobs stored in this browser.
  // Under `npm run dev:mock` the local login uses the in-browser mock services instead.
  const localSession = isLocalSession(session) && !mockApiEnabled;
  const [serverJobs, setServerJobs] = useState([]);
  const [serverJobsStatus, setServerJobsStatus] = useState(localSession ? "local" : "loading");

  const loadServerJobs = useCallback(
    () =>
      listJobs().then(
        ({ data }) => ({ ok: true, jobs: (Array.isArray(data) ? data : []).map(fromJobResponse) }),
        (error) => {
          console.error("Failed to load jobs:", error);
          return { ok: false, jobs: [] };
        },
      ),
    [],
  );

  const applyServerJobs = useCallback((result) => {
    if (result.ok) setServerJobs(result.jobs);
    setServerJobsStatus(result.ok ? "ready" : "error");
  }, []);

  /** Reloads the list (after a decision, or "Try again"). */
  const refreshServerJobs = useCallback(() => {
    if (!localSession) loadServerJobs().then(applyServerJobs);
  }, [localSession, loadServerJobs, applyServerJobs]);

  // Every school of the tenant (GET /school-profiles, ADMIN): names and ids for the
  // school filters and for posting a job for a school.
  const [schools, setSchools] = useState([]);
  useEffect(() => {
    if (localSession) return undefined;
    let cancelled = false;
    listAllSchoolProfiles()
      .then((list) => {
        if (cancelled) return;
        setSchools(
          list
            .filter((sp) => sp.schoolProfileId && sp.schoolName)
            .map((sp) => ({ id: sp.schoolProfileId, name: sp.schoolName, status: sp.schoolProfileStatus, city: sp.address?.city || "" }))
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
      })
      .catch((error) => console.error("Failed to load schools:", error));
    return () => {
      cancelled = true;
    };
  }, [localSession]);

  useEffect(() => {
    if (localSession) return undefined;
    let cancelled = false;
    loadServerJobs().then((result) => {
      if (!cancelled) applyServerJobs(result);
    });
    return () => {
      cancelled = true;
    };
  }, [localSession, loadServerJobs, applyServerJobs]);

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
    // To the website home page first: ending the session while still on a protected page
    // would make its route guard send the user to /login instead.
    navigate("/", { replace: true });
    await signOut();
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
    )?.[1] || "Admin";

  // Jobs this admin posted for schools (Manage Jobs), and the schools they can post for:
  // the account's own list plus every school that already has a job.
  // This browser's list ("skooljobs_jobs") is shared with the school pages, which keep
  // copies of the server's jobs there (UUID ids). Once the server's list is loaded those
  // copies are dropped, so a job never shows twice (one copy stuck in "Pending Approval").
  const UUID_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const serverIds = new Set(serverJobs.map((j) => String(j.id)));
  const localOnlyJobs =
    serverJobsStatus === "ready"
      ? jobs.filter((j) => !serverIds.has(String(j.id)) && !UUID_ID.test(String(j.id)))
      : jobs;
  const myJobs = localOnlyJobs.filter((j) => j.schoolEmail === currentUser.email);
  const managedSchools = Array.from(
    new Set([
      ...schools.map((sc) => sc.name),
      ...(localSession ? currentUser.managedSchools || [] : []),
      ...[...serverJobs, ...localOnlyJobs].map((j) => j.schoolName).filter(Boolean),
    ]),
  ).sort((a, b) => a.localeCompare(b));

  // Lists across the admin pages: the schools' jobs from the server, then the jobs this
  // browser keeps (the admin's own posts, and everything when logged in locally).
  const allJobs = [...serverJobs, ...localOnlyJobs];

  const outletCtx = {
    jobs: allJobs,
    setJobs,
    myJobs,
    currentUser,
    managedSchools,
    schools,
    serverJobs,
    setServerJobs,
    serverJobsStatus,
    refreshServerJobs,
  };

  const navList = (
    <nav className={styles.nav} aria-label="Admin">
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
          <div className={styles.brandText}>
            <BrandLogo onDark height={44} />
            <p className={styles.brandSub}>Admin</p>
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
              <p className={styles.headerContext}>Admin</p>
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
              <PersonAvatar src={currentUser.profilePhoto} name={adminLabel} className={styles.avatar} />
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
