import { useEffect, useMemo, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import {
  Briefcase,
  Building2,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import Topbar from "../components/topbar";
import styles from "./AdminLayout.module.css";

const sidebarItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" },
  { label: "Job Approvals", icon: ClipboardCheck, path: "/admin/job-approvals" },
  { label: "All Jobs", icon: Briefcase, path: "/admin/jobs" },
  { label: "Schools", icon: Building2, path: "/admin/schools" },
];

const AdminLayout = () => {
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
    return <Navigate to="/" replace />;
  }

  // Ends the signup-service session (POST /auth/logout) and clears "currentUser".
  const handleLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const outletCtx = { jobs, setJobs, currentUser };

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarInner}>
            <div className={styles.brandRow}>
              <div className={styles.brandMark}>SJ</div>
              <div className={styles.brandText}>
                <p className={styles.brandName}>SkoolJobs</p>
                <p className={styles.brandSub}>Platform Admin</p>
              </div>
            </div>

            <nav className={styles.nav}>
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.path ||
                  location.pathname.startsWith(item.path + "/");
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => navigate(item.path)}
                    className={`${styles.navButton} ${isActive ? styles.navButtonActive : ""
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
            title="SkoolJobs Admin"
            subtitle="Review job submissions from every school on the platform."
          />

          <div className={styles.mobileNavWrap}>
            <div className={styles.mobileNavBar}>
              <span className={styles.mobileNavTitle}>
                {sidebarItems.find((item) => item.path === location.pathname)
                  ?.label || "Menu"}
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
                  const isActive =
                    location.pathname === item.path ||
                    location.pathname.startsWith(item.path + "/");
                  return (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => navigate(item.path)}
                      className={`${styles.mobileNavButton} ${isActive ? styles.mobileNavButtonActive : ""
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

export default AdminLayout;