import { useNavigate, useOutletContext } from "react-router-dom";
import {
  BriefcaseBusiness,
  PlusCircle,
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Inbox,
  ThumbsUp,
  UserPlus,
  XCircle,
} from "lucide-react";
import ui from "./styles/AdminUi.module.css";
import styles from "./styles/AdminDashboard.module.css";
import { LIVE_STATUSES, PENDING, REJECTED } from "./jobStatus";

const PREVIEW_LIMIT = 5;

const AdminDashboard = () => {
  const { jobs } = useOutletContext();
  const navigate = useNavigate();

  const schools = new Set(jobs.map((j) => j.schoolName).filter(Boolean));
  const pendingJobs = jobs
    .filter((j) => j.status === PENDING)
    .sort((a, b) => a.id - b.id);
  const approvedCount = jobs.filter((j) => j.status === "Approved").length;
  const liveCount = jobs.filter((j) => LIVE_STATUSES.includes(j.status)).length;
  const rejectedCount = jobs.filter((j) => j.status === REJECTED).length;

  const stats = [
    { label: "Schools", value: schools.size, sub: "with at least one job", icon: Building2, tone: styles.toneNavy },
    { label: "Total Jobs", value: jobs.length, sub: "all statuses", icon: Briefcase, tone: styles.toneBlue },
    { label: "Pending Approval", value: pendingJobs.length, sub: "needs your review", icon: Clock, tone: styles.toneAmber },
    { label: "Approved", value: approvedCount, sub: "waiting on school to publish", icon: ThumbsUp, tone: styles.toneBlue },
    { label: "Live", value: liveCount, sub: "visible to teachers", icon: CheckCircle2, tone: styles.toneGreen },
    { label: "Rejected", value: rejectedCount, sub: "sent back with a reason", icon: XCircle, tone: styles.toneRed },
  ];

  const quickActions = [
    {
      label: "Invite Schools",
      text: "Add a school administrator to the platform.",
      icon: UserPlus,
      path: "/admin/invite-schools",
    },
    {
      label: "Job Approvals",
      text: "Review jobs submitted by schools.",
      icon: ClipboardCheck,
      path: "/admin/job-approvals",
    },
    {
      label: "All Jobs",
      text: "Every job on the platform, in every status.",
      icon: Briefcase,
      path: "/admin/jobs",
    },
    {
      label: "Schools",
      text: "Schools that have submitted jobs.",
      icon: Building2,
      path: "/admin/schools",
    },
    {
      label: "Post a New Job",
      text: "Post a job for one of the schools.",
      icon: PlusCircle,
      path: "/admin/post-job",
    },
    {
      label: "Manage Jobs",
      text: "Jobs you posted for schools.",
      icon: BriefcaseBusiness,
      path: "/admin/manage-jobs",
    },
  ];

  return (
    <div className={ui.page}>
      <div className={ui.pageHeader}>
        <div>
          <h2 className={ui.pageTitle}>Dashboard</h2>
          <p className={ui.pageSubtitle}>
            An overview of jobs submitted by schools. Nothing reaches teachers
            until you approve it, and the school then takes the final
            "Publish" step.
          </p>
        </div>
      </div>

      <div className={styles.statsGrid}>
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`${ui.card} ${styles.statCard}`}>
              <div className={styles.statTop}>
                <p className={styles.statLabel}>{stat.label}</p>
                <span className={`${styles.statIcon} ${stat.tone}`} aria-hidden="true">
                  <Icon size={18} />
                </span>
              </div>
              <p className={styles.statValue}>{stat.value}</p>
              <p className={styles.statSub}>{stat.sub}</p>
            </div>
          );
        })}
      </div>

      <div className={styles.columns}>
        <section className={ui.card} aria-labelledby="pending-heading">
          <div className={ui.cardHead}>
            <div>
              <h3 id="pending-heading" className={ui.cardTitle}>
                Pending approvals
              </h3>
              <p className={ui.cardSubtitle}>Oldest submissions first</p>
            </div>
            {pendingJobs.length > 0 && (
              <button
                type="button"
                className={ui.linkButton}
                onClick={() => navigate("/admin/job-approvals")}
              >
                Review all <ArrowRight size={14} />
              </button>
            )}
          </div>

          {pendingJobs.length === 0 ? (
            <div className={ui.emptyState}>
              <span className={ui.emptyIcon}><Inbox size={20} /></span>
              <p className={ui.emptyTitle}>Nothing waiting on review</p>
              <p className={ui.emptyText}>
                Jobs that schools send for approval will appear here.
              </p>
            </div>
          ) : (
            <ul className={styles.pendingList}>
              {pendingJobs.slice(0, PREVIEW_LIMIT).map((job) => (
                <li key={job.id} className={styles.pendingItem}>
                  <div className={styles.pendingMain}>
                    <p className={styles.pendingTitle}>{job.title}</p>
                    <p className={styles.pendingMeta}>
                      {[job.schoolName, job.location, job.date && `Submitted ${job.date}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <span className={`${ui.chip} ${ui.chipPending}`}>Pending</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={ui.card} aria-labelledby="actions-heading">
          <div className={ui.cardHead}>
            <h3 id="actions-heading" className={ui.cardTitle}>
              Quick actions
            </h3>
          </div>
          <div className={styles.actionList}>
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.path}
                  type="button"
                  className={styles.actionItem}
                  onClick={() => navigate(action.path)}
                >
                  <span className={styles.actionIcon} aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <span className={styles.actionText}>
                    <span className={styles.actionLabel}>{action.label}</span>
                    <span className={styles.actionSub}>{action.text}</span>
                  </span>
                  <ArrowRight size={16} className={styles.actionArrow} aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;
