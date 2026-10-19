import { useEffect, useMemo, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import {
  BriefcaseBusiness,
  Building2,
  LayoutDashboard,
  LogOut,
  Menu,
  PlusCircle,
  X,
} from "lucide-react";
import Topbar from "../components/topbar";
import styles from "./HeadAdminLayout.module.css";

const sidebarItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/head-admin/dashboard" },
  { label: "Post a New Job", icon: PlusCircle, path: "/head-admin/post-job" },
  { label: "Manage Jobs", icon: BriefcaseBusiness, path: "/head-admin/manage-jobs" },
];

const HeadAdminLayout = () => {
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

  if (!localStorage.getItem("currentUser") || currentUser.role !== "headAdmin") {
    return <Navigate to="/" replace />;
  }

  const managedSchools = currentUser.managedSchools || [];
  const myJobs = jobs.filter((j) => j.schoolEmail === currentUser.email);

  // Ends the signup-service session (POST /auth/logout) and clears "currentUser".
  const handleLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const outletCtx = { jobs, setJobs, myJobs, currentUser, managedSchools };

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarInner}>
            <div className={styles.brandRow}>
              <div className={styles.brandMark}>
                <Building2 size={20} />
              </div>
              <div className={styles.brandText}>
                <p className={styles.brandName}>{currentUser.companyName}</p>
                <p className={styles.brandSub}>
                  Head Admin · {managedSchools.length} schools
                </p>
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
            title="Head Admin Dashboard"
            subtitle={`Manage job postings across all ${managedSchools.length} of your schools.`}
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

export default HeadAdminLayout;
