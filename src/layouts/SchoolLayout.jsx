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
import { withoutDemoApplicants, withoutDemoInterviews, withoutDemoJobs } from "../lib/schooldata";
import { useImageUpload } from "../lib/useImageUpload";
import { listJobs } from "../services/jobService";
import { BrandLogo } from "../components/BrandLogo";
import { DocumentImage } from "../components/DocumentImage";
import { rememberSavedSchoolProfile, useOwnSchoolProfile } from "../features/school/ownSchoolProfile";
import { DOCUMENT_TYPES, uploadDocumentRef } from "../services/documentService";
import { updateSchoolProfile } from "../services/schoolProfileService";
import styles from "./SchoolLayout.module.css";


// Real JobResponse (job service) -> the shape SchoolManageJobs/SchoolJobDetail
// already render. Status-transition fields (Active/Paused/Closed/Draft as a
// user action) have no backend equivalent today - UpdateJobRequest carries no
// status field - so `status` below is read-only display derived from the
// backend's own status/adminReviewStatus strings, not round-tripped on save.
const JOB_STATUS_DISPLAY = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending Approval",
  SCHEDULED: "Scheduled",
  ACTIVE: "Active",
  PAUSED: "Paused",
  CLOSED: "Closed",
  EXPIRED: "Expired",
};

const mapJobResponse = (job) => ({
  id: job.jobId,
  schoolProfileId: job.schoolProfileId,
  title: job.title,
  subject: job.subject,
  roleType: job.roleCategory,
  employmentType: job.employmentType,
  location: job.location,
  experience: job.experienceRequired,
  vacancies: job.vacancies,
  salaryRange: job.compensation,
  description: job.description,
  requirements: job.requirements,
  qualifications: Array.isArray(job.qualificationsRequired)
    ? job.qualificationsRequired.join(", ")
    : job.qualificationsRequired,
  // A rejected job goes back to DRAFT with the admin's reason.
  status:
    job.status === "DRAFT" && job.adminReviewStatus === "REJECTED"
      ? "Rejected"
      : JOB_STATUS_DISPLAY[job.status] || job.status,
  rejectionReason: job.adminRejectionReason,
  applicants: job.applicantsCount || 0,
  date: job.postedDate,
  expiryDate: job.expiryDate,
});


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
    try {
      return withoutDemoJobs(JSON.parse(localStorage.getItem("skooljobs_jobs") || "[]"));
    } catch {
      return [];
    }
  });
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState(null);

  const [applicants, setApplicants] = useState(() => {
    try {
      const parsed = withoutDemoApplicants(JSON.parse(localStorage.getItem("skooljobs_applicants") || "[]"));
      return parsed.map((a) => a.status === "Applied" ? { ...a, status: "Not Reviewed" } : a);
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("skooljobs_jobs", JSON.stringify(jobs));
  }, [jobs]);

  useEffect(() => {
    localStorage.setItem("skooljobs_applicants", JSON.stringify(applicants));
  }, [applicants]);

  // The School Admin's own school (GET /school-profiles/me): name and logo for the sidebar.
  const { profile: schoolProfile, refresh: refreshSchoolProfile } = useOwnSchoolProfile();
  const logoImage = schoolProfile?.logoUrl || null;
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState(null);
  const {
    error: logoImageError,
    validating: logoImageValidating,
    validateAndProcess: validateLogoImage,
  } = useImageUpload("logo");
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  // Real notifications arrive as toasts from the notification socket.
  const [notifications, setNotifications] = useState([]);
  const [interviews, setInterviews] = useState(() => {
    try {
      return withoutDemoInterviews(JSON.parse(localStorage.getItem("skooljobs_interviews") || "[]"));
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("skooljobs_interviews", JSON.stringify(interviews));
  }, [interviews]);

  const currentUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("currentUser") || "{}"); } catch { return {}; }
  }, []);

  // This school's jobs from the job service (GET /jobs?schoolProfileId=… — every status for
  // the school's own team). A School Member has no /school-profiles/me, so they see the jobs
  // they posted themselves.
  const ownSchoolId = schoolProfile?.schoolProfileId || null;
  useEffect(() => {
    let cancelled = false;
    listJobs(ownSchoolId ? { schoolProfileId: ownSchoolId } : {})
      .then(({ data }) => {
        if (cancelled || !Array.isArray(data)) return;
        const own = ownSchoolId
          ? data
          : data.filter((j) => currentUser.id && String(j.postedByUserId) === String(currentUser.id));
        setJobs(own.map(mapJobResponse));
        setJobsError(null);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to load jobs:", error);
        setJobsError(error);
      })
      .finally(() => {
        if (!cancelled) setJobsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ownSchoolId, currentUser.id]);

  if (!localStorage.getItem("currentUser")) {
    return <Navigate to="/app" replace />;
  }

  const schoolName =
    schoolProfile?.schoolName || currentUser.companyName || currentUser.schoolName || currentUser.firstName || "Your school";
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
    if (!url) return;
    URL.revokeObjectURL(url);
    if (!schoolProfile?.schoolProfileId) return;
    setLogoUploadError(null);
    setLogoUploading(true);
    try {
      // Store the file, then save its reference as the school's logo (unsent fields are kept).
      const logoUrl = await uploadDocumentRef({
        ownerId: schoolProfile.schoolProfileId,
        documentType: DOCUMENT_TYPES.SCHOOL_LOGO,
        file,
      });
      await updateSchoolProfile({
        schoolProfileId: schoolProfile.schoolProfileId,
        schoolName: schoolProfile.schoolName,
        logoUrl,
      });
      rememberSavedSchoolProfile({ ...schoolProfile, logoUrl });
    } catch (error) {
      console.error("Failed to update the school logo:", error);
      setLogoUploadError("Couldn't update the logo. Please try again.");
    } finally {
      setLogoUploading(false);
    }
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
    jobsLoading,
    jobsError,
    applicants,
    setApplicants,
    logoImage,
    schoolProfile,
    refreshSchoolProfile,
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
            <BrandLogo onDark height={44} className={styles.brandLogo} />
            {/* Only the School Admin has the profile (and may change the logo). */}
            {schoolProfile?.schoolProfileId && (
              <label className={styles.logoUploadLabel}>
                <Upload size={13} />
                {logoImageValidating ? "Checking..." : logoUploading ? "Uploading..." : "Upload Institute Logo"}
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  disabled={logoImageValidating || logoUploading}
                  onChange={handleLogoUpload}
                />
              </label>
            )}
            {(logoImageError || logoUploadError) && (
              <p className={styles.uploadError}>{logoImageError || logoUploadError}</p>
            )}

            <div className={styles.schoolInfoRow}>
              <div className={styles.logoBox}>
                {logoImage ? (
                  <DocumentImage src={logoImage} alt="logo" className={styles.logoImage} />
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
              <BrandLogo height={30} className={styles.mobileNavLogo} />
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
